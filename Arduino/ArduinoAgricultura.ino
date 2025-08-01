// // Pines
// int sensorPin = A0;
// int ledRojo = 8;
// int ledVerde = 9;

// void setup() {
//   Serial.begin(9600);  // Iniciar comunicación serial
//   pinMode(ledRojo, OUTPUT);
//   pinMode(ledVerde, OUTPUT);
// }

// void loop() {
//   int valorSensor = analogRead(sensorPin); // Lectura analógica: 0 (húmedo) a 1023 (seco)
//   // Convertir a porcentaje de humedad (ajustar si el sensor da invertido)
//   int humedad = map(valorSensor, 1023, 0, 0, 100);  

//   // Mostrar porcentaje en monitor serial
//   Serial.print("Humedad del suelo: ");
//   Serial.print(humedad);
//   Serial.println("%");

//   // Activar LED según nivel de humedad
//   if (humedad < 30) {
//     digitalWrite(ledRojo, HIGH);
//     digitalWrite(ledVerde, LOW);
//   } else {
//     digitalWrite(ledRojo, LOW);
//     digitalWrite(ledVerde, HIGH);
//   }

//   delay(1000); // Esperar 1 segundos
// }