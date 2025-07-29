from flask import Flask, jsonify, request
import mysql.connector
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def obtener_conexion():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="monitoreo_parcela"
    )

# ------------------------
# Endpoint: todos los datos (limit 50)
# ------------------------
@app.route('/api/datos')
def obtener_datos():
    conexion = obtener_conexion()
    cursor = conexion.cursor()

    # Seleccionamos Fecha y Hora ya formateadas en SQL
    cursor.execute("""
        SELECT
        DATE_FORMAT(fecha_hora, '%d/%m/%Y') AS fecha,
        DATE_FORMAT(fecha_hora, '%H:%i:%s') AS hora,
        humedad,
        estado_suelo
        FROM datos_parcela
        ORDER BY fecha_hora DESC
        LIMIT 50
    """)
    resultados = cursor.fetchall()
    cursor.close()
    conexion.close()

    # Ahora cada fila viene (fecha, hora, humedad, estado_suelo)
    datos = [
        {
            "fecha": fila[0],
            "hora": fila[1],
            "humedad": float(fila[2]),
            "estado_suelo": fila[3]
        }
        for fila in resultados
    ]
    return jsonify(datos)

# -------------------------------------
# Endpoint: datos filtrados por rango
# -------------------------------------
@app.route('/api/datos-filtrados')
def datos_filtrados():
    inicio = request.args.get('inicio')  # formato: "YYYY-MM-DD HH:MM:SS"
    fin    = request.args.get('fin')

    if not inicio or not fin:
        return jsonify({"error": "Faltan parámetros 'inicio' y/o 'fin'"}), 400

    conexion = obtener_conexion()
    cursor = conexion.cursor()
    consulta = (
        "SELECT DATE_FORMAT(fecha_hora, '%%Y-%%m-%%d %%H:%%i:%%s'), humedad "
        "FROM datos_parcela "
        "WHERE fecha_hora BETWEEN %s AND %s "
        "ORDER BY fecha_hora ASC"
    )
    cursor.execute(consulta, (inicio, fin))
    resultados = cursor.fetchall()
    cursor.close()
    conexion.close()

    datos = [
        {
            "fecha_hora": fila[0],
            "humedad": float(fila[1])
        }
        for fila in resultados
    ]
    return jsonify(datos)

# ------------------------------------------------
# Endpoint: última humedad (dato más reciente)
# ------------------------------------------------
@app.route('/api/ultima-humedad')
def obtener_ultima_humedad():
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    cursor.execute(
        "SELECT humedad FROM datos_parcela ORDER BY fecha_hora DESC LIMIT 1"
    )
    resultado = cursor.fetchone()
    cursor.close()
    conexion.close()

    if resultado:
        return jsonify({"humedad": float(resultado[0])})
    else:
        return jsonify({"error": "No hay datos"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
