from flask import Flask, jsonify, request
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)

def obtener_conexion():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="root",
        database="monitoreo_parcela"
    )

# ─── Todos los datos para la tabla (limit 50) ───
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

    datos = [{
        "id": row[0],
        "fecha_hora": row[1].strftime("%Y-%m-%d %H:%M:%S"),
        "humedad": float(row[2]),
        "estado_suelo": row[3]
    } for row in rows]
    return jsonify(datos)


# ─── Datos filtrados para la línea ───
@app.route('/api/datos-filtrados')
def datos_filtrados():
    inicio = request.args.get('inicio')
    fin    = request.args.get('fin')
    print(f"Filtro recibido: inicio={inicio}, fin={fin}")
    # El resto igual...

    if not inicio or not fin:
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

    datos = [{
        "fecha_hora": row[0].strftime("%Y-%m-%d %H:%M:%S"),
        "humedad": float(row[1])
    } for row in rows]
    return jsonify(datos)


# ─── Última humedad para el velocímetro ───
@app.route('/api/ultima-humedad')
def ultima_humedad():
    conn = obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("SELECT humedad FROM datos_parcela ORDER BY fecha_hora DESC LIMIT 1")
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if row:
        return jsonify({"humedad": float(row[0])})
    else:
        return jsonify({"error": "No hay datos"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000)
