# poblar_datos.py
import mysql.connector
import random
from datetime import datetime, timedelta

# Configura tu conexión (ajusta usuario/clave si es necesario)
conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="root",
    database="monitoreo_parcela"
)
cursor = conn.cursor()

# Configura la fecha de inicio y cuántos días
fecha_inicio = datetime(2025, 6, 1)    # desde junio hasta agosto inicio 1 final 31
dias = 92                             # Un año
#quiero desde junio hasta agosto como haria en el 2025
for d in range(dias):
    fecha_actual = fecha_inicio + timedelta(days=d)
    for i in range(10):
        # Genera una hora/minuto/segundo aleatorio en ese día
        hora = random.randint(0, 23)
        minuto = random.randint(0, 59)
        segundo = random.randint(0, 59)
        fecha_hora = fecha_actual.replace(hour=hora, minute=minuto, second=segundo)

        # Genera humedad entre 10 y 60%
        humedad = round(random.uniform(10, 60), 2)
        estado = 'Baja (LED rojo)' if humedad < 30 else 'Adecuada (LED verde)'

        cursor.execute(
            "INSERT INTO datos_parcela (fecha_hora, humedad, estado_suelo) VALUES (%s, %s, %s)",
            (fecha_hora.strftime('%Y-%m-%d %H:%M:%S'), humedad, estado)
        )

conn.commit()
cursor.close()
conn.close()
print("✅ Base de datos poblada con datos simulados.")
