require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken'); // ✅ Fixed import

const app = express();
const port = process.env.PORT || 3000;

// Load sensitive data from .env
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // frontend URL
    credentials: true
}));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.status(200).send('TravelEase server is running...');
});

async function run() {
    try {
        const client = new MongoClient(uri, {
            serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
        });
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const vehiclesCollection = db.collection('vehicles');
        const usersCollection = db.collection('users');
        const bookingCollection = db.collection('bookings');

        // ---------------- USERS ----------------
        // Create user
        app.post('/users', async (req, res) => {
            const newUser = req.body;

            // Check if user exists
            const existingUser = await usersCollection.findOne({ email: newUser.email });
            if (existingUser) {
                return res.status(200).send({ message: 'User already exists' });
            }

            await usersCollection.insertOne(newUser);
            res.status(201).send({ message: 'User created' });
        });

        // Login user and return JWT
        app.post("/login", async (req, res) => {
            const { email } = req.body;
            const user = await usersCollection.findOne({ email });

            if (!user) return res.status(401).send({ error: "User not found" });

            // Generate JWT
            const token = jwt.sign(
                { email: user.email, id: user._id },
                JWT_SECRET,
                { expiresIn: "1h" }
            );

            res.send({ token });
        });

        // ---------------- VEHICLES ----------------
        app.get('/vehicles', async (req, res) => {
            const vehicles = await vehiclesCollection.find().sort({ created_at: -1 }).limit(6).toArray();
            res.send(vehicles);
        });

        app.get('/allVehicles', async (req, res) => {
            const allVehicles = await vehiclesCollection.find().sort({ created_at: -1 }).toArray();
            res.send(allVehicles);
        });

        app.get('/allVehicles/:id', async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) return res.status(400).send({ error: 'Invalid vehicle ID' });

            const vehicle = await vehiclesCollection.findOne({ _id: new ObjectId(id) });
            if (!vehicle) return res.status(404).send({ message: 'Vehicle not found' });

            res.send(vehicle);
        });

        app.post('/vehicles', async (req, res) => {
            const vehicle = { ...req.body, created_at: new Date() };
            const result = await vehiclesCollection.insertOne(vehicle);
            res.status(201).send({ message: 'Vehicle added successfully', insertedId: result.insertedId });
        });

        app.put('/vehicles/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;

            const result = await vehiclesCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            if (result.modifiedCount === 1) res.send({ message: 'Vehicle updated successfully' });
            else res.status(400).send({ error: 'No changes made or invalid ID' });
        });

        app.delete('/vehicles/:id', async (req, res) => {
            const { id } = req.params;
            const result = await vehiclesCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) return res.status(404).send({ error: 'Vehicle not found' });
            res.send({ message: 'Vehicle deleted successfully' });
        });

        // ---------------- BOOKINGS ----------------
        app.get('/bookings', async (req, res) => {
            const bookings = await bookingCollection.find().toArray();
            res.send(bookings);
        });

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const existing = await bookingCollection.findOne({ vehicleId: booking.vehicleId });

            if (existing) return res.status(400).send({ error: 'This vehicle is already booked' });

            const result = await bookingCollection.insertOne(booking);
            res.send({ message: 'Booking saved successfully', bookingId: result.insertedId });
        });

        app.delete('/bookings/:id', async (req, res) => {
            const { id } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) return res.status(404).send({ error: 'Booking not found' });
            res.send({ message: 'Booking canceled successfully' });
        });

    } catch (err) {
        console.error('MongoDB connection failed:', err);
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`TravelEase server is running on port: ${port}`);
});
