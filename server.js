const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { mongoose } = require("mongoose");
var cors = require('cors')
const questionModel = require("./models/questions.js");
const sessionModel = require("./models/userDetails.js")
require("dotenv").config();



// Twilio STUN and TURN server
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);


// const TwilioClient = require('twilio').Client;
// const client = new TwilioClient(accountSid, authToken, "interviewspace-backend");


// to parse post request
app.use(
    express.urlencoded({
        extended: true
    })
)
app.use(express.json())


// sending request from reactjs to get question was giving cors error which got fixed by this
app.use(cors());

const io = require("socket.io")(server, {
    cors: {
        origin: ["http://localhost:3000", "https://interview-space-frontend.vercel.app"],
        methods: ["GET", "POST"],
    }
})

let pass = process.env.PASS;
let db = process.env.DB;

mongoose.connect(
    "mongodb+srv://sakshamarya01:" + pass + "@interviewspace.ahh2j.mongodb.net/" + db + "?retryWrites=true&w=majority",
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
);

async function getData() {
    const questions = await questionModel.find({});

    let randomIndex = Math.floor((Math.random() * questions.length));
    // console.log(randomIndex + "index selected from data object array");

    const dataToBeSent = {
        link: "",
        heading: "",
        description: []
    }

    try {
        dataToBeSent.link = questions[randomIndex].link;
        dataToBeSent.heading = questions[randomIndex].heading;
        dataToBeSent.description = questions[randomIndex].description.split("\n");

        return dataToBeSent;
    } catch (error) {
        console.log(error);
    }

}


function compare(a,b){
    let dd1=parseInt(a.date[0]+a.date[1]);
    let mm1=parseInt(a.date[3]+a.date[4]);
    let yy1=parseInt(a.date.substr(6,4));

    let dd2=parseInt(b.date[0]+b.date[1]);
    let mm2=parseInt(b.date[3]+b.date[4]);
    let yy2=parseInt(b.date.substr(6,4));

    if(yy1<yy2){
      return 1;
    }
    else if(yy1>yy2){
      return -1;
    }
    else{
      if(mm1<mm2){
        return 1;
      }
      else if(mm1>mm2){
        return -1;
      }
      else{
        if(dd1<dd2){
          return 1;
        }
        else if(dd1>dd2){
          return -1;
        }
        else{
          return 0;
        }
      }
    }

  }

async function getSessionRecords(mailId) {
    try {
        const session = await sessionModel.find({ userEmail: mailId });
        session.sort(compare);
        return session;
    } catch (error) {
        return error;
    }
}

app.get("/twilioServers",(req,res)=>{

    // Extracting STUN and TURN URLS and credentials
    
    client.tokens.create().then((token) =>{

        const data = {
            stunURL: token.iceServers[0].url,
            turnURL: token.iceServers[1].url,
            turnUsername: token.iceServers[1].username,
            turnPass: token.iceServers[1].credential
        }
        res.send(data);
    });
    
    
})

app.get("/getQuestion", async (req, res) => {
    const question = await getData();
    // console.log(question);
    res.send(question);
})



app.post("/insertSessionDetails", async (req, res) => {
    console.log(req.body.createSession.current);

    const data = new sessionModel(req.body.createSession.current);

    try {
        const res = await data.save();
        // console.log(res);

    } catch (error) {
        console.log(error);
    }

    res.send(200);
})



app.post("/getSessionRecords", async (req, res) => {
    try {
        const sessionData = await getSessionRecords(req.body.id);
        console.log(req.body);
        console.log(sessionData)
        res.send(sessionData);
    } catch (error) {
        res.send(error);
    }
})

io.on("connection", (socket) => {

    socket.on("me", () => {
        socket.emit("me", socket.id);
    })


    socket.on("disconnect", () => {
        socket.broadcast.emit("callEnded");
    });

    socket.on("callUser", (data) => {
        io.to(data.userToCall).emit("callUser", {
            signal: data.signalData,
            from: data.from,
            name: data.name
        });
    });

    socket.on("answerCall", (data) => {

        // all rooms and connected users
        // console.log(io.sockets.adapter.rooms);

        io.to(data.to).emit("callAccepted", data.signal)
    });

    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
    })

    socket.on("showQuestion", (roomId, questionObject) => {
        // console.log("question request recieved, broadcasting question to room ", roomId);
        // console.log(questionObject);
        io.to(roomId).emit("showQuestion", roomId, questionObject);
    })

    socket.on("onLeaveCall", (id1, id2) => {
        io.to(id1).to(id2).emit("onLeaveCall", id1, id2);
    })

    socket.on("updateQuestionList", (id, link) => {
        io.to(id).emit("updateQuestionList", id, link);
    })


    socket.on("changeEditorValue", (value, id) => {
        io.to(id).emit("changeEditorValue", value, id);
        // socket.broadcast.to(id).emit("changeEditorValue", value, id);
    })

})

let PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log("server listening on port 5000");
})