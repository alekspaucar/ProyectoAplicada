# backend.py — Lectura de Arduino y guardado en MySQL

import time
from datetime import datetime

import mysql.connector
import serial
import serial.tools.list_ports

# Configuración de conexión MySQL
DB_CONFIG = {
    'host':     'localhost',
    'user':     'root',
    'password': 'root',
    'database': 'monitoreo_parcela'
}

# Puerto y velocidad de Arduino
BAUDRATE = 9600
SERIAL_TIMEOUT = 1  # segundos


def encontrar_puerto_arduino():
    puertos = serial.tools.list_ports.comports()
    for puerto in puertos:
        desc = puerto.description.lower()
        if 'arduino' in desc or 'usb serial device' in desc:
            return puerto.device
    return None


def conectar_base_datos():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        print("✅ Conexión a la base de datos exitosa")
        return conn
    except mysql.connector.Error as err:
        print(f"❌ Error al conectar a la base de datos: {err}")
        return None


def abrir_puerto_serial(puerto):
    try:
        ser = serial.Serial(puerto, BAUDRATE, timeout=SERIAL_TIMEOUT)
        print(f"✅ Puerto serial abierto: {puerto}")
        return ser
    except serial.SerialException as e:
        print(f"❌ No se pudo abrir puerto serial {puerto}: {e}")
        return None


def formatear_estado(hum):
    return "Baja (LED rojo)" if hum < 30 else "Adecuada (LED verde)"


def main():
    # 1) Encuentra Arduino
    puerto = encontrar_puerto_arduino()
    if not puerto:
        print("❌ No se encontró ningún Arduino conectado")
        return

    # 2) Abre puerto serial
    arduino = abrir_puerto_serial(puerto)
    if not arduino:
        return

    # 3) Conecta a la base de datos
    conexion = conectar_base_datos()
    if not conexion:
        arduino.close()
        return
    cursor = conexion.cursor()

    print("🔄 Iniciando monitoreo de humedad...")
    try:
        while True:
            try:
                linea = arduino.readline().decode('utf-8', errors='ignore').strip()
                if not linea:
                    # No hay dato, seguir leyendo
                    time.sleep(1)
                    continue

                # Intentar extraer solo el número (p. ej., "36.2" de "humedad: 36.2%")
                texto = linea.lower().replace('%', '').replace('humedad del suelo:', '').strip()
                humedad = float(texto)

                ahora = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                estado = formatear_estado(humedad)

                cursor.execute(
                    "INSERT INTO datos_parcela (fecha_hora, humedad, estado_suelo) "
                    "VALUES (%s, %s, %s)",
                    (ahora, humedad, estado)
                )
                conexion.commit()
                print(f"✅ {ahora} – {humedad:.1f}% – {estado}")

            except ValueError:
                # Dato no numérico
                print(f"❌ Dato inválido recibido: '{linea}'")
            except serial.SerialException as e:
                # Problema de comunicación serial
                print(f"⚠️ SerialException: {e}")
                # Intentar reconexión del puerto
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
                # Problema con la BD
                print(f"❌ Error en inserción a BD: {db_err}")
                time.sleep(5)

            # Breve pausa antes de la siguiente lectura
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n🔴 Monitoreo detenido por usuario")

    finally:
        # Cierre ordenado de recursos
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


if __name__ == '__main__':
    main()
