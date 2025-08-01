# backend.py — Lectura de Arduino por puerto serial y guardado en MySQL

import time                       # Para manejo de tiempos y retardos
from datetime import datetime     # Para fechas y horas actuales

import mysql.connector            # Conector MySQL para Python
import serial                     # Para comunicación serial con Arduino
import serial.tools.list_ports    # Para buscar puertos seriales disponibles

# Configuración de conexión MySQL (ajusta según tu BD)
DB_CONFIG = {
    'host':     'localhost',
    'user':     'root',
    'password': 'root',
    'database': 'monitoreo_parcela'
}

# Puerto y velocidad de Arduino
BAUDRATE = 9600
SERIAL_TIMEOUT = 1  # segundos de espera en serial

# ----------------------------------------
# Función para buscar el puerto donde está el Arduino
def encontrar_puerto_arduino():
    puertos = serial.tools.list_ports.comports()
    for puerto in puertos:
        desc = puerto.description.lower()
        # Busca dispositivos que digan "arduino" o "usb serial device"
        if 'arduino' in desc or 'usb serial device' in desc:
            return puerto.device
    return None

# ----------------------------------------
# Función para conectar a la base de datos
def conectar_base_datos():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✅ Conexión a la base de datos exitosa")
        return conn
    except mysql.connector.Error as err:
        print(f"❌ Error al conectar a la base de datos: {err}")
        return None

# ----------------------------------------
# Función para abrir el puerto serial con Arduino
def abrir_puerto_serial(puerto):
    try:
        ser = serial.Serial(puerto, BAUDRATE, timeout=SERIAL_TIMEOUT)
        print(f"✅ Puerto serial abierto: {puerto}")
        return ser
    except serial.SerialException as e:
        print(f"❌ No se pudo abrir puerto serial {puerto}: {e}")
        return None

# ----------------------------------------
# Devuelve el estado textual según el valor de humedad
def formatear_estado(hum):
    return "Baja (LED rojo)" if hum < 30 else "Adecuada (LED verde)"

# ----------------------------------------
def main():
    # 1) Buscar Arduino conectado
    puerto = encontrar_puerto_arduino()
    if not puerto:
        print("❌ No se encontró ningún Arduino conectado")
        return

    # 2) Abrir puerto serial
    arduino = abrir_puerto_serial(puerto)
    if not arduino:
        return

    # 3) Conectar a la base de datos MySQL
    conexion = conectar_base_datos()
    if not conexion:
        arduino.close()
        return
    cursor = conexion.cursor()

    # Intervalo de inserción de datos en segundos (ajustable)
    intervalo = 30          # <<<<<< Cambia aquí el tiempo (en segundos)
    ultima_insercion = 0   

    print("🔄 Iniciando monitoreo de humedad...")
    try:
        while True:    # Bucle infinito hasta que se detenga manualmente
            try:
                # Lee línea del Arduino por serial
                linea = arduino.readline().decode('utf-8', errors='ignore').strip()
                if not linea:
                    time.sleep(0.1)
                    continue  # Si no hay dato, espera y repite

                # Limpia el texto y extrae el número de humedad
                texto = linea.lower().replace('%', '').replace('humedad del suelo:', '').strip()
                humedad = float(texto)

                ahora = datetime.now()
                ahora_ts = ahora.timestamp()  # Tiempo actual en segundos (float)

                # Solo inserta si pasó el intervalo definido
                if ahora_ts - ultima_insercion >= intervalo:
                    estado = formatear_estado(humedad)
                    cursor.execute(
                        "INSERT INTO datos_parcela (fecha_hora, humedad, estado_suelo) VALUES (%s, %s, %s)",
                        (ahora.strftime('%Y-%m-%d %H:%M:%S'), humedad, estado) #strftime lo convierte a texto con formato: Año-mes-día horas:minutos:segundos
                    )
                    conexion.commit()
                    ultima_insercion = ahora_ts
                    print(f"✅ {ahora.strftime('%Y-%m-%d %H:%M:%S')} – {humedad:.1f}% – {estado}")

            except ValueError:
                # Si no se pudo convertir a float (dato inválido)
                print(f"❌ Dato inválido recibido: '{linea}'")
            except serial.SerialException as e:
                # Problema con el puerto serial: intenta reabrir
                print(f"⚠️ SerialException: {e}")
                try:
                    if arduino.is_open:
                        arduino.close()
                    time.sleep(2)
                    arduino.open()
                    print("🔄 Puerto serial reabierto")
                except Exception as reopen_err:
                    print(f"❌ No se pudo reabrir puerto: {reopen_err}")
                    time.sleep(5)
            except mysql.connector.Error as db_err:
                # Problema con la BD (permisos, conexión, etc)
                print(f"❌ Error en inserción a BD: {db_err}")
                time.sleep(5)

            # Pequeña espera para no saturar el CPU (ciclo ágil)
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n🔴 Monitoreo detenido por usuario")

    finally:
        # Cierra todo ordenadamente
        try:
            if arduino and arduino.is_open:
                arduino.close()
        except Exception:
            pass
        try:
            if conexion and conexion.is_connected():
                conexion.close()
        except Exception:
            pass
        print("🗑️ Recursos liberados")

# ----------------------------------------
if __name__ == '__main__':
    main()



# ¿Cómo explico este archivo?
# "backend.py se encarga de leer los datos de humedad del Arduino por el puerto serial, y guardarlos automáticamente en la base de datos MySQL."

# "intervalo define cada cuántos segundos se guardan los datos (ajustable por código, por ejemplo cada 2 segundos)."

# "El script se mantiene corriendo, y si falla la comunicación o hay un error de BD, intenta recuperarse solo."

# "Al final, cuando paro el script, libera todos los recursos (puerto serial y conexión MySQL)."