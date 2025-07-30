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

    intervalo = 2  # <<<<<<<< Cambia aquí la frecuencia en segundos (ej: 1, 2, 5, etc)
    ultima_insercion = 0  # Timestamp de la última inserción

    print("🔄 Iniciando monitoreo de humedad...")
    try:
        while True:
            try:
                linea = arduino.readline().decode('utf-8', errors='ignore').strip()
                if not linea:
                    time.sleep(0.1)
                    continue

                texto = linea.lower().replace('%', '').replace('humedad del suelo:', '').strip()
                humedad = float(texto)

                ahora = datetime.now()
                ahora_ts = ahora.timestamp()  # Tiempo actual en segundos

                if ahora_ts - ultima_insercion >= intervalo:
                    estado = formatear_estado(humedad)
                    cursor.execute(
                        "INSERT INTO datos_parcela (fecha_hora, humedad, estado_suelo) VALUES (%s, %s, %s)",
                        (ahora.strftime('%Y-%m-%d %H:%M:%S'), humedad, estado)
                    )
                    conexion.commit()
                    ultima_insercion = ahora_ts
                    print(f"✅ {ahora.strftime('%Y-%m-%d %H:%M:%S')} – {humedad:.1f}% – {estado}")

            except ValueError:
                print(f"❌ Dato inválido recibido: '{linea}'")
            except serial.SerialException as e:
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
                print(f"❌ Error en inserción a BD: {db_err}")
                time.sleep(5)

            # Bucle ágil, pero sin saturar CPU
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("\n🔴 Monitoreo detenido por usuario")

    finally:
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
