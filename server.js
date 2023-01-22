const express = require('express');
const ejs = require('ejs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.urlencoded({extended: true}));
app.set('view engine', 'ejs');

dotenv.config();
const atlas = {
    user: process.env.USER,
    pass: process.env.PASS,
    db: process.env.DB,
    cluster: process.env.CLUSTER
};
const saltRounds = 10;

mongoose.set('strictQuery', true);
const uri = `mongodb+srv://${atlas.user}:${atlas.pass}@${atlas.cluster}.jdavibi.mongodb.net/${atlas.db}?retryWrites=true&w=majority`;
mongoose.connect(uri);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    secrets: []
});

// const secretKey = process.env.SECRET_KEY;
// userSchema.plugin(encrypt, { secret: secretKey, encryptedFields: ['password'] });
const User = mongoose.model('user', userSchema);

var activeUser = "__no_active_user__";



app.route('/')
    .get((req, res)=> {
        if(activeUser === "__no_active_user__") res.render('home');
        else {
            User.findOne({username: activeUser}, (err, foundUser)=> {
                if(err) res.send(err);
                else if(!foundUser) res.send("User error"); 
                else res.render('secrets', {username: foundUser.username ,secrets: foundUser.secrets});
            });
        }
    });

app.route('/login')
    .get((req, res)=> res.render('login'))
    .post((req,res)=> {

        const userCreds = {
            username: req.body.username,
            password: req.body.password
        }
        
        User.findOne({username: userCreds.username}, (err, foundUser)=> {
            if(err) console.log(err);
            else if(!foundUser) res.send("User not Found");
            else {
                bcrypt.compare(userCreds.password, foundUser.password, function(err, result) {
                    // result == true
                    if(result==true) {
                        activeUser = foundUser.username;
                        res.render('secrets', {username: foundUser.username, secrets: foundUser.secrets});
                    }
                    else res.send("Incorrect Password");
                });
            }
        });
    });

app.route('/logout')
    .get((req, res)=> {
        activeUser = "__no_active_user__";
        res.redirect('/');
    });

app.route('/register')
    .get((req,res)=> res.render('register'))
    .post((req, res)=> {



        bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
            // Store hash in your password DB.
            if(err) res.send(err);
            else {

                const userCreds = {
                    username: req.body.username,
                    password: hash,
                    secrets: []
                }

                const user = new User(userCreds);
                user.save((err)=> {
                    if(err) res.send(err);
                    else {
                        activeUser = userCreds.username;
                        res.render('submit');
                    }
                });
            }
        });

    });

app.route('/submit')
    .get((req,res)=> {
        if(activeUser!=="__no_active_user__") res.render('submit');
        else res.send("Please login first!!");
    })
    .post((req, res)=> {

        const secretContent = req.body.secret;
        // console.log(secretContent);
            if(activeUser!=="__no_active_user__") {
                // console.log(activeUser);
                User.updateOne({username: activeUser}, {$push: {secrets: secretContent}}, (err)=> {
                    if(err) console.log(err);
                });
                User.findOne({username: activeUser}, (err, foundUser)=> {
                    if(err) res.send(err);
                    else if(!foundUser) res.send("User error"); 
                    else res.render('secrets', {username: foundUser.username ,secrets: foundUser.secrets});
                })
            }
            else res.send("Please Login first");

    });


const port = 3000;
app.listen(port, ()=> console.log(`Server Started at: ${port}`));