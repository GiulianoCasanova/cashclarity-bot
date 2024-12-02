const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Habilitar CORS para permitir que el widget haga solicitudes
app.use(cors());

// Middleware para procesar cuerpos de solicitudes JSON
app.use(bodyParser.json());

// Ruta de conversión de divisas
app.get('/convertir', async (req, res) => {
    const { monto, origen, destino } = req.query;

    if (!monto || !origen || !destino) {
        return res.status(400).json({ error: 'Faltan parámetros: monto, origen, destino' });
    }

    try {
        // Consulta la API de tasas de cambio (puedes cambiar la URL por la de tu API)
        const response = await axios.get(`https://v6.exchangerate-api.com/v6/40a8b5e3eebc1c11c12c895b/latest/${origen}`);
        const rates = response.data.conversion_rates;

        if (!rates[destino]) {
            return res.status(404).json({ error: `No se encontró la moneda destino: ${destino}` });
        }

        const montoConvertido = (monto * rates[destino]).toFixed(2);

        res.json({
            monto_original: monto,
            moneda_origen: origen,
            moneda_destino: destino,
            monto_convertido: montoConvertido
        });
    } catch (error) {
        console.error('Error al consultar la API:', error.message);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar el servidor en el puerto 3000
app.listen(port, () => {
    console.log(`Servidor de API corriendo en http://localhost:${port}`);
});
