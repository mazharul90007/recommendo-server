const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;


//middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res)=>{
    res.send('Recommendo is Running....')
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ltdwa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const queryCollection = client.db('queryDB').collection('queries');

    app.post('/queries', async(req, res)=>{
      const query = req.body;
      console.log(query);
      const result = await queryCollection.insertOne(query);
      res.send(result);
    })

    // app.get('/queries', async(req, res)=>{
    //   const result = await queryCollection.find().toArray();
    //   res.send(result);
    // })

    app.get('/queries', async(req, res)=>{
      let query = {};
      const authorEmail = req.query.authorEmail;
      console.log(req.query?.authorEmail)
      if(authorEmail){
        query = {authorEmail: authorEmail}
      }
      const result = await queryCollection.find(query).toArray();
      res.send(result);
    })

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.listen(port, (req, res)=>{
    console.log(`Recommendo is running on ${port}`)
})