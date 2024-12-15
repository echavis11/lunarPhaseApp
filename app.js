const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const readline = require('readline'); 
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const { MONGO_DB_USERNAME, MONGO_DB_PASSWORD, MONGO_DB_NAME, MONGO_COLLECTION } = process.env;
const mongoURI = `mongodb+srv://${MONGO_DB_USERNAME}:${MONGO_DB_PASSWORD}@cluster0.zzp5v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

let db, collection;
MongoClient.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db(MONGO_DB_NAME);
        collection = db.collection(MONGO_COLLECTION);
        console.log('Connected to MongoDB');
    })
    .catch(err => console.error('MongoDB connection error:', err));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/finder', (req, res) => {
    res.render('finder');
});

app.get('/history', async (req, res) => {
    try {
        const history = await collection.find().sort({ createdAt: -1 }).toArray();
        res.render('history', { history });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).send('Failed to fetch history.');
    }
});

app.post('/moon-phase', async (req, res) => {
    const { lat, lon, date, time } = req.body;

    try {
        const dateTime = new Date(`${date}T${time}:00`);
        const timestamp = Math.floor(dateTime.getTime() / 1000);

        const response = await axios.get('https://luna-phase.p.rapidapi.com/Luna_Phase', {
            params: { lat, lon, timestamp },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'luna-phase.p.rapidapi.com'
            }
        });

        const lunarData = response.data;

        await collection.insertOne({
            lat: lat,
            lon: lon,
            date,
            time,
            timestamp,
            lunarData,
            createdAt: new Date()
        });

        res.render('result', { lunarData });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Failed to fetch lunar phase data.');
    }
});

app.post('/clear-history', async (req, res) => {
    try {
        await collection.deleteMany({}); 
        res.redirect('/history'); 
    } catch (error) {
        console.error('Error clearing database:', error);
        res.status(500).send('Failed to clear history.');
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    if (input.trim().toLowerCase() === 'stop') {
        console.log('Stopping the server...');
    
        server.close(() => {
            console.log('Server stopped.');
            process.exit(0); 
        });
    } else {
        console.log(`Unknown command: ${input}`);
    }
});
