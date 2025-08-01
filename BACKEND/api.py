# api.py — API Flask para exponer los datos de MySQL al frontend (JS)

from flask import Flask, jsonify, request  # Importa el framework Flask y utilidades para API REST
from flask_cors import CORS               # Permite el acceso cross-origin desde el frontend (CORS)
import mysql.connector                    # Conector para MySQL

app = Flask(__name__)  # Crea la aplicación Flask
CORS(app)              # Habilita CORS para todos los endpoints

# ---------------------------------------
# Función para obtener la conexión a la base de datos
def obtener_conexion():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="monitoreo_parcela"
    )

# ---------------------------------------
# Endpoint para obtener los últimos 50 datos (para la tabla de monitoreo)
@app.route('/api/datos')
def obtener_datos():
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT
            id,
            fecha_hora,     -- DATETIME puro
            humedad,
            estado_suelo
        FROM datos_parcela
        ORDER BY fecha_hora DESC
        LIMIT 50
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convierte los resultados en una lista de diccionarios JSON para el frontend
    datos = [{
        "id": row[0],                                        # ID autoincremental de la BD
        "fecha_hora": row[1].strftime("%Y-%m-%d %H:%M:%S"),  # Formatea la fecha/hora
        "humedad": float(row[2]),                            # Valor de humedad como float
        "estado_suelo": row[3]                               # Estado del suelo
    } for row in rows]
    return jsonify(datos)   # Retorna la lista en formato JSON

# ---------------------------------------
# Endpoint para obtener datos filtrados por fecha/hora (para el gráfico de línea y barra)
@app.route('/api/datos-filtrados')
def datos_filtrados():
    inicio = request.args.get('inicio')                         # Toma el parámetro 'inicio' de la URL
    fin    = request.args.get('fin')                            # Toma el parámetro 'fin' de la URL
    print(f"Filtro recibido: inicio={inicio}, fin={fin}")       # Debug en consola

    if not inicio or not fin:
        # Si falta algún parámetro, retorna error
        return jsonify({"error": "Faltan 'inicio' y/o 'fin'"}), 400

    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT fecha_hora, humedad
        FROM datos_parcela
        WHERE fecha_hora BETWEEN %s AND %s
        ORDER BY fecha_hora ASC
    """, (inicio, fin))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    # Convierte los datos filtrados a lista de diccionarios para la gráfica
    datos = [{
        "fecha_hora": row[0].strftime("%Y-%m-%d %H:%M:%S"),
        "humedad": float(row[1])
    } for row in rows]
    return jsonify(datos)


# """select fecha_hora,humedad from  datos_parcela where fecha_hora
#   between %s and %s and estado_suelo=%s order by fecha_hora asc"""
#  (inicio,fin,"baja(LED Rojo)")
#
# ---------------------------------------
# Endpoint para obtener la última humedad registrada (para el velocímetro)
@app.route('/api/ultima-humedad')
def ultima_humedad():
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("SELECT humedad FROM datos_parcela ORDER BY fecha_hora DESC LIMIT 1")
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        # Si existe al menos un dato, lo devuelve como JSON
        return jsonify({"humedad": float(row[0])})
    else:
        # Si no hay datos, responde con error 404
        return jsonify({"error": "No hay datos"}), 404

# ---------------------------------------
# Ejecuta la aplicación si este archivo se corre directamente
if __name__ == '__main__':
    app.run(debug=True, port=5000)



# ¿Cómo explicar este archivo ?-----------------------------------------------------------------------

# "El api.py es el intermediario entre el frontend y la base de datos. Expone endpoints para consultar los datos,
#  filtrarlos por intervalo, y obtener la última humedad para el velocímetro."

# "El endpoint /api/datos me sirve para la tabla en monitoreo, /api/datos-filtrados para los gráficos por intervalo
#  y /api/ultima-humedad para los widgets en tiempo real."

# "Todos los endpoints devuelven JSON, que es fácil de consumir en JavaScript."

# ENDPOINT ES: Es una “dirección” (URL) específica dentro de tu API.

# PARA QUE SIRVE EL JSON: Para enviar datos desde el backend al frontend y viceversa.

# QUE ES REST: (REpresentational State Transfer) es un estilo para diseñar APIs usando URLs, métodos HTTP (GET, POST, etc.), y datos en formato JSON.

