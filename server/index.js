const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId, Timestamp } = require('mongodb');
const jwt = require('jsonwebtoken');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 8000;

// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

// Verify Token Middleware
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log(token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.user = decoded;
        next();
    });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.b5mwu75.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
    }
});

async function run() {
    try {
        const db = client.db('stayVista');
        const roomsCollection = db.collection('rooms');
        const usersCollection = db.collection('users');
        const bookingsCollection = db.collection('bookings');

        // verify admin middleware
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.user?.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (!user || user?.role !== 'admin') {
                return res.status(403).send({
                    message: 'forbidden access'
                });
            }
            next();
        };

        // verify host middleware
        const verifyHost = async (req, res, next) => {
            const decodedEmail = req.user?.email;
            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);
            if (!user || user?.role !== 'host') {
                return res.status(403).send({
                    message: 'forbidden access'
                });
            }
            next();
        };

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d'
            });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            }).send({ success: true });
        });

        // Logout
        app.get('/logout', async (req, res) => {
            try {
                res.clearCookie('token', {
                    maxAge: 0,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
                }).send({ success: true });
                console.log('Logout successful');
            } catch (err) {
                res.status(500).send(err);
            }
        });

        // create-payment-intent
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const price = req.body.price;
            const priceInCent = parseFloat(price) * 100;

            if (!price || priceInCent < 1) return;

            // generate clientSecret
            const { client_secret } = await stripe.paymentIntents.create({
                amount: priceInCent,
                currency: 'usd',
                automatic_payment_methods: {
                    enabled: true
                }
            });

            // send client secret as response
            res.send({ clientSecret: client_secret });
        });

        // Get all rooms from the database
        app.get('/rooms', async (req, res) => {
            //  const category = req.query.category;
            const { category } = req.query;

            let query = {};

            if (category && category !== 'all' && category !== 'undefined' && category !== 'null') {
                query.category = category;
            }

            const rooms = await roomsCollection.find(query).toArray();
            res.send(rooms);
        });

        // save a user data in db
        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email };

            // check if user already exists in db
            const isExist = await usersCollection.findOne(query);

            if (isExist) {
                // if user already exists and status is 'Requested' then update the status in db
                if (user.status === 'Requested') {
                    const result = await usersCollection.updateOne(query, {
                        $set: { status: user?.status }
                    });
                    return res.send(result);
                } else {
                    // if user already exists and status is not 'Requested' then return the user data from db
                    return res.send(isExist);
                }
            }

            // save user for the first time
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...user,
                    Timestamp: Date.now()
                }
            };

            const result = await usersCollection.updateOne(query, updateDoc, options);
            res.send(result);
        });

        // get a user data by email
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        // get all users data from db
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        //update a user role by email
        app.patch('/users/update/:email', verifyToken, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email };
            const updateDoc = {
                $set: {
                    ...user,
                    Timestamp: Date.now()
                }
            };

            const result = await usersCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // Get all rooms for host by email
        app.get('/my-listings/:email', verifyToken, verifyHost, async (req, res) => {
            const email = req.params.email;
            let query = { 'host.email': email };
            const rooms = await roomsCollection.find(query).toArray();
            res.send(rooms);
        });

        // delete a room
        app.delete('/room/:id', verifyToken, verifyHost, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await roomsCollection.deleteOne(query);
            res.send(result);
        });

        // Save a room data in db
        app.post('/room', verifyToken, verifyHost, async (req, res) => {
            const roomData = req.body;
            const result = await roomsCollection.insertOne(roomData);
            res.send(result);
        });

        // Get a single room by ID
        app.get('/rooms/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const room = await roomsCollection.findOne(query);
            res.send(room);
        });

        // Save a booking data in db
        app.post('/booking', verifyToken, async (req, res) => {
            const bookingData = req.body;
            // save room booking info
            const result = await bookingsCollection.insertOne(bookingData);

            // // change room availability status
            // const roomId = bookingData.roomId;
            // const query = { _id: new ObjectId(roomId) }
            // const updateDoc = {
            //     $set: {booked: true}
            // }
            // const updatedRoom = await roomsCollection.updateOne(query, updateDoc);
            // console.log(updatedRoom)

            // res.send({result, updatedRoom});
            res.send(result);
        });

        // update rooms status optional
        app.patch('/room/status/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: new ObjectId(id) };

            const updateDoc = {
                $set: { booked: status }
            };
            const result = await roomsCollection.updateOne(query, updateDoc);
            res.send(result);
        });

        // get all booking for a guest
        app.get('/my-bookings/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const query = { 'guest.email': email };
            const result = await bookingsCollection.find(query).toArray();
            res.send(result);
        });

        // get all booking for a host
        app.get('/manage-bookings/:email', verifyToken, verifyHost, async (req, res) => {
            const email = req.params.email;
            const query = { 'host.email': email };
            const result = await bookingsCollection.find(query).toArray();
            console.log(result);
            res.send(result);
        });

        // delete a booking
        app.delete('/booking/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingsCollection.deleteOne(query);
            res.send(result);
        });

        // admin Statistics
        app.get('/admin-stat', verifyToken, verifyAdmin, async (req, res) => {
            const bookingDetails = await bookingsCollection.find(
                {},
                {
                    projection: {
                        date: 1,
                        price: 1
                    }
                }
            ).toArray();

            const totalUsers = await usersCollection.countDocuments();
            const totalRooms = await roomsCollection.countDocuments();
            const totalBookings = await bookingsCollection.countDocuments();
            const totalSales = bookingDetails.reduce((acc, booking) => acc + booking.price, 0);

            // export const data = [
            //     ['Day', 'Sales'],
            //     ['9', 1000],
            //     ['10', 1170],
            //     ['11', 660],
            //     ['12', 1030]
            // ];

            const chartData = bookingDetails.map(booking => {
                const day = new Date(booking.date).getDate();
                const month = new Date(booking.date).getMonth() + 1;
                const data = [`${day}/${month}`, booking?.price];
                return data;
            });
            
            chartData.unshift(['Day', 'Sales']);
            // chartData.splice(0, 0, ['Day', 'Sales']);


            console.log(chartData);
            
            res.send({
                totalUsers,
                totalRooms,
                totalBookings,
                totalSales,
                chartData
            })
        });

        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. You successfully connected to MongoDB!');
    } finally {
        // Ensures that the client will close when you finish/error
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from StayVista Server..');
});

app.listen(port, () => {
    console.log(`StayVista is running on port ${port}`);
});
