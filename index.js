const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;


//middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://recommendo-b1c90.web.app',
    'https://recommendo-b1c90.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
  // console.log('inside verifyToken middleware');
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized Access' })
    }
    req.user = decoded;
    next()
  })
  
}

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
    const recommendCollection = client.db('queryDB').collection('recommendation');

    //Auth Related APIs
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5h' });
      res
        .cookie('token', token, {
          httpOnly: true,
          // secure: false
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",

        })
        .send({ success: true })

    })

    app.post('/logout', (req, res)=>{
      res
      .clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      })
      .send({success: true})
    })


    //Query APIs

    app.post('/queries', async(req, res)=>{
      const query = req.body;
      // console.log(query);
      const result = await queryCollection.insertOne(query);
      res.send(result);
    })

    app.get('/queries', async(req, res)=>{
      let query = {};
      const authorEmail = req.query.authorEmail;
      // console.log(req.query?.authorEmail)
      if(authorEmail){
        query = {authorEmail: authorEmail}
      }
      const result = await queryCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/queries/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await queryCollection.findOne(query);
      res.send(result);
    })

    //delete from queries
    app.delete('/queries/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await queryCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/queries/:id', async(req, res)=>{
      const id = req.params.id;
      const query = req.body
      const filter = {_id: new ObjectId(id)};
      const options = {upsert: true}
      const updateQuery = {
        $set: {
          productName: query.productName,
          brandName: query.brandName,
          imageURL: query.imageURL,
          queryTitle: query.queryTitle,
          boycott: query.boycott,
          query: query.query,
          postedTime: query.postedTime
        }
      }
      const result = await queryCollection.updateOne(filter, updateQuery, options);
      res.send(result)
    })




    //Recommendation APIs
    app.post('/recommendation', async(req, res)=>{
      const recommendation = req.body;
      const result = await recommendCollection.insertOne(recommendation);

      const id = recommendation.queryId;
      const query = {_id: new ObjectId(id)}
      const targetQuery = await queryCollection.findOne(query);
      console.log(targetQuery);

      let newCount = 0;
      if(targetQuery.recommendationCount){
        newCount = targetQuery.recommendationCount + 1;
      }
      else{
        newCount = 1;
      }

      //update target Query info
      const filter = {_id: new ObjectId(id)}
      const updateQuery = {
        $set: {
          recommendationCount: newCount,

        }
      }
      const updateResult = await queryCollection.updateOne(filter, updateQuery );

      res.send(result);
    })

    // get All the Recommendation Data
    app.get('/allRecommendation', async(req, res)=>{
      const result = await recommendCollection.find().toArray();
      res.send(result);

    })

    //get By QueryId
    app.get('/recommendation/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {queryId: id};
      const result = await recommendCollection.find(query).toArray();
      res.send(result);
    })

    //delete all recommendation related to my query
    app.delete('/recommendation/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id)
      const query = {queryId: id};
      const result = await recommendCollection.deleteMany(query);
      res.send(result);
    })

    //Recommendation for me
    app.get('/recommendation', async(req, res)=>{
      const userEmail = req.query.userEmail;
      const query = {userEmail: userEmail}
      const result = await recommendCollection.find(query).toArray();
      res.send(result);
    })

    //Delete Recommendation
    app.delete('/recommendationForMe/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await recommendCollection.deleteOne(query);
      res.send(result)

    })

    //Recommendation for me details
    app.get('/recommendationForMe/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await recommendCollection.findOne(query);
      res.send(result);

    })

    // My Recommendation
    app.get('/myRecommendation', verifyToken, async(req, res)=>{
      const recommenderEmail = req.query.recommenderEmail;
      const query = {recommenderEmail: recommenderEmail}

      if(req.user.email !== req.query.email){
        return res.status(403).send({message: 'forbidden access'})
      }

      const result = await recommendCollection.find(query).toArray();
      res.send(result);
    })

    //My Recommendation Details
    app.get('/myRecommendation/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await recommendCollection.findOne(query);
      res.send(result);

    })

    //Delete from myRecommendation
    app.delete('/myRecommendation/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await recommendCollection.deleteOne(query);
      res.send(result)

    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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