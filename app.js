//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const nodemailer = require("nodemailer");
const uuid = require("uuid");
const path = require('path')
const shortid = require('shortid')
const Razorpay = require('razorpay')
const cors = require('cors')
const http = require('http');
const url = require('url');
const fast2sms = require('fast-two-sms');
const { Client, Webhook, resources } = require('coinbase-commerce-node');
const coinbaseSecret = process.env.COINBASE_API;
Client.init(coinbaseSecret);
const { Charge } = resources;
const speakeasy = require("speakeasy");
const qrcode = require('qrcode');


const app = express();


app.set('view engine', 'ejs');

app.use(cors())

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser.json());

app.use(express.static("public"));

app.use(cookieParser());

app.use(session({
    secret: process.env.RANDOM,
    saveUninitialized:false,
    resave: false
}));
//
//mongodb://localhost:27017/cr3DB
mongoose.connect("mongodb+srv://alex-dan:Admin-12345@cluster0.wirm8.mongodb.net/cr3DB", {useNewUrlParser: true});


const messageSchema = new mongoose.Schema({
  sponID: String,
  message:[{
    from:String,
    to:String,
    date: String
  }],
  unread: Boolean
});
const teamSchema = new mongoose.Schema({
  person1: String,
  person2: String,
  person3: String,
  teamTag: String,
  number: Number,
  progress: Number
});
const transactionSchema = new mongoose.Schema({
  type: String,
  mode: String,
  amount: String,
  date: String,
  id: String
});
const balanceSchema = new mongoose.Schema({
  ri: Number,
  wb: Number,
  nw: Number,
  ot: Number,
  oa: Number
});
const earningsSchema = new mongoose.Schema({
  ab: {
    ri: Number,
    wb: Number,
    nw: Number,
    ot: Number,
    oa: Number
  },
  te: Number,
  ri: Number,
  wb: Number,
  nw: Number,
  ot: Number,
  oa: Number
});
const bankDetailsSchema = new mongoose.Schema({
  accountNumber: String,
  name: String,
  bankName: String,
  ifsc: String
});
const adminSchema = new mongoose.Schema({
  email: String,
  withdrawals: [{
    name: String,
    accountNumber: String,
    email: String,
    ifsc: String,
    amount: String,
    bankName: String,
    date: String,
    payment_id: String,
    from: String
  }],
  report:[{
    date: String,
    amount: Number
  }]

});
const historySchema = new mongoose.Schema({
  alertType: String,
  status: String,
  amount: String,
  time: String,
  payment_id: String
});
const userSchema = new mongoose.Schema ({
  userID: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  sponsorID:{
    type: String,
    required: true
  },
  earnings: earningsSchema,

  balance: balanceSchema,

  sponID: {
    type: String,
    required: true
  },
  bankDetails: bankDetailsSchema,
  history:[historySchema],
  team: [teamSchema],
  vacant: Boolean,
  leaderTag: Boolean,
  time: String,
  uuid: String,
  status: String,
  wallet: Number,
  secret: String,
  transaction: [transactionSchema],
  message: [messageSchema],
  notification:[{
    userID: String,
    sponID:String
  }]

});
const paymentSchema = new mongoose.Schema({
  payment_id: String,
  status: String,
  amount: Number,
  vpa: String,
  rrn: String,
  token: String,
  email: String,
  number: String
});
const orderSchema = new mongoose.Schema({
  email: String,
  data: Object,
  checkout: Object,
  id: String,
  type: String,
  token: String
})

userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

const Payment = new mongoose.model("Payment", paymentSchema);

const Admin = new mongoose.model("Admin", adminSchema);

const Order = new mongoose.model("Order", orderSchema);


//Get requests
app.get("/", function(req, res){

  res.render("home");
});

app.get("/register", function(req,res){
  if(req.session.sponsorID){
  res.render("register", {sponsorID: req.session.sponsorID});
  }else{
  res.render("register");
  }
});

app.get("/login", function(req, res){
  if(req.session.user){
    res.redirect("/dashboard");
  }else{
    res.render("login");
  }
});

app.get("/dashboard", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      User.find({status: "Active+"}, function(err, users){
        User.find({status: "Active"}, function(err, active){
              const activeUsers = [];
              let unread = [];
              if(foundUser.notification != undefined){
                unread = foundUser.notification;
              }
              if(users){
                users.forEach(function(sponsors){
                  if(sponsors.sponsorID == foundUser.sponID){
                    activeUsers.push(sponsors);
                  }
                });
              }
              if(active){
                active.forEach(function(sponsors){
                  if(sponsors.sponsorID == foundUser.sponID){
                    activeUsers.push(sponsors);
                  }
                });
              }
              const usrID = foundUser.userID;
              const te = foundUser.earnings.te;
              const ri = foundUser.earnings.ri;
              const wb = foundUser.earnings.wb;
              const nw = foundUser.earnings.nw;
              let ref = activeUsers.length;
              const percentage = ref*5;
              const bar_width = ref*10;
              const sponsorID = foundUser.sponID;
              if(unread.length != 0){
              if(foundUser.status == 'Active+'){
                const ab = foundUser.earnings.ab.nw + foundUser.earnings.ab.ri + foundUser.earnings.ab.wb +foundUser.earnings.ab.ot + foundUser.earnings.ab.oa;
                const available = {
                  nw:foundUser.earnings.ab.nw,
                  ri:foundUser.earnings.ab.ri,
                  wb:foundUser.earnings.ab.wb,
                  ot:foundUser.earnings.ab.ot,
                  oa:foundUser.earnings.ab.oa

                }
                if(ref != 0){
                 res.render("dashboard", {usrID,unread:unread,wallet:foundUser.wallet, available, ab, te, ri,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, sponsorID, wb, nw, ref, percentage, bar_width, status: foundUser.status});
               }else{

                  res.render("dashboard", {usrID,unread:unread,wallet:foundUser.wallet, available, ab, te, ri,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, sponsorID, wb, nw, status: foundUser.status});
               }
             }else{
               const ab = foundUser.earnings.ab.nw + foundUser.earnings.ab.ri + foundUser.earnings.ab.wb;

                 if(ref != 0){
                  res.render("dashboard", {usrID,unread:unread, ab, te, ri, sponsorID, wb, nw, ref, percentage, bar_width, status: foundUser.status});
                }else{

                   res.render("dashboard", {usrID,unread:unread, ab, te, ri, sponsorID, wb, nw, status: foundUser.status});
                }
             }
              }else{
              if(foundUser.status == 'Active+'){
                const ab = foundUser.earnings.ab.nw + foundUser.earnings.ab.ri + foundUser.earnings.ab.wb +foundUser.earnings.ab.ot + foundUser.earnings.ab.oa;
                const available = {
                  nw:foundUser.earnings.ab.nw,
                  ri:foundUser.earnings.ab.ri,
                  wb:foundUser.earnings.ab.wb,
                  ot:foundUser.earnings.ab.ot,
                  oa:foundUser.earnings.ab.oa

                }
                if(ref != 0){
                 res.render("dashboard", {usrID, ab, te,wallet:foundUser.wallet, available, ri,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, sponsorID, wb, nw, ref, percentage, bar_width, status: foundUser.status});
               }else{

                  res.render("dashboard", {usrID, ab, te,wallet:foundUser.wallet, available, ri,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, sponsorID, wb, nw, status: foundUser.status});
               }
             }else{
               const ab = foundUser.earnings.ab.nw + foundUser.earnings.ab.ri + foundUser.earnings.ab.wb;

                 if(ref != 0){
                  res.render("dashboard", {usrID, ab, te, ri, sponsorID, wb, nw, ref, percentage, bar_width, status: foundUser.status});
                }else{

                   res.render("dashboard", {usrID, ab, te, ri, sponsorID, wb, nw, status: foundUser.status});
                }
             }
              }
         });
        });
      });
  }

});

app.get( "/profile" , function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    if(!req.session.admin){
        User.findOne({email:req.session.user.email}, function(err, foundUser){
          if(err){
            console.log(err);
          }else {
            User.find({sponsorID: foundUser.sponID}, function(err, users){
              let activePro =[];
              users.forEach(function(pro){
                if(pro.status === "Active+"){
                  if(pro.vacant !== false){
                    activePro.push(pro);
                  }
                }
              });
              if(!foundUser.bankDetails){
                res.render('profile', {user:foundUser,status:foundUser.status});
              }else{
                res.render('profile', {user:foundUser,status:foundUser.status, bank:foundUser.bankDetails});
              }
            });

          }
        });
      }else{
        User.findOne({email:req.session.user.email}, function(err, foundUser){
          if(err){
            console.log(err);
          }else {
            User.find({sponsorID: foundUser.sponID}, function(err, users){
              let activePro =[];
              users.forEach(function(pro){
                if(pro.status === "Active+"){
                  if(pro.vacant !== false){
                    activePro.push(pro);
                  }
                }
              });
              if(!foundUser.bankDetails){
                res.render('profile', {user:foundUser, admin: 'ok' });
              }else{
                res.render('profile', {user:foundUser, bank:foundUser.bankDetails, admin: 'ok' });
              }
            });

          }
        });
      }
    }
  });

app.get("/logout", function(req, res){
  req.session.destroy();
  res.redirect("/login");
});

app.get("/itsOnlyForUAndMe", function(req, res){
    res.render("adminPanel");
});

app.get("/withdraw", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      const ri = foundUser.earnings.ab.ri;
      const wb = foundUser.earnings.ab.wb;
      const nw = foundUser.earnings.ab.nw;
      const usrID = foundUser.userID;
      if(foundUser.status == 'Active+'){
        if(foundUser.bankDetails){
            res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
        }else{
            res.render("withdrawal", {status: foundUser.status, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
        }
      }else{
        if(foundUser.bankDetails){
            res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails, ri, wb, nw});
        }else{
            res.render("withdrawal", {status: foundUser.status, ri, wb, nw});
        }
      }
    });
  }
});

app.get("/downlines", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    if(!req.session.admin){
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      User.find({sponsorID: foundUser.sponID}, function(err, users){
        let active =[];
        users.forEach(function(pro){
          if(pro.status != "Inactive"){
            active.push(pro);
          }
        });
        if(!users){
          res.render('downlines', {user: foundUser, status: foundUser.status})
        }else{
          if(active.length != 0){
          res.render('downlines', {user: foundUser,users: users, activeUsers: active, downline: users.length,activeDownline: active.length, status: foundUser.status})
          }else{
            res.render('downlines', {user: foundUser,users: users, downline: users.length, status: foundUser.status})
          }
        }
      });
    });
    }else{

      User.findOne({email: req.session.user.email}, function(err, foundUser){
        User.find({sponsorID: foundUser.sponID}, function(err, users){
          let active =[];
          users.forEach(function(pro){
            if(pro.status != "Inactive"){
              active.push(pro);
            }
          });
          if(!users){
            res.render('downlines', {user: foundUser, status: foundUser.status, admin: 'ok'})
          }else{
            if(active.length != 0){
            res.render('downlines', {user: foundUser,users: users, activeUsers: active, downline: users.length,activeDownline: active.length, status: foundUser.status, admin: 'ok'})
            }else{
              res.render('downlines', {user: foundUser,users: users, downline: users.length, status: foundUser.status, admin: 'ok'})
            }
          }
        });
      });
    }
  }
});

app.get("/history", function(req, res){
  if(!req.session.user){
    res.redirect('/login');
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser.history){
          if(foundUser.history.length != 0){
          res.render('history', {status:foundUser.status, user: foundUser, history: foundUser.history});
          }else{
          res.render('history', {status:foundUser.status, user: foundUser});
          }
        }else{
          res.render('history', {status:foundUser.status, user: foundUser});
        }
      }
    })
  }
});

app.get("/payment-portal", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        res.render("payment-portal", {user: foundUser,wallet:foundUser.wallet,status: foundUser.status });
      }
    });
  }
});

app.get("/transactions", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
  User.findOne({email: req.session.user.email}, function(err, foundUser){
    const payment = foundUser.transaction;
    if(payment.length == 0){
        res.render('transactions', {status:foundUser.status, user: foundUser});
      }else {
        res.render('transactions', {status:foundUser.status, user: foundUser, transaction: payment});
      }

  });
}
});

app.get("/register/:sponsorID", function(req, res){

  req.session.sponsorID = req.params.sponsorID;
  res.redirect("/register")
});

app.get("/orion", function(req, res){
  if(!req.session.user){
      res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.find({sponsorID: foundUser.sponID}, function(err, activeUsers){
          let activePro = [];
          activeUsers.forEach(function(trial){
            if(trial.status === "Active+"){
              activePro.push(trial);
            }
          });
          let occupy =[];
          activeUsers.forEach(function(pro){
            if(pro.status === "Active+"){
              if(pro.vacant !== false){
                occupy.push(pro);
              }
            }
          });
          if(foundUser.team.length === 0){
            res.render("orion", {user: foundUser,occupy,activePro,status: foundUser.status });
          }else{
            res.render("orion", {user: foundUser,team: foundUser.team,activePro,occupy,status: foundUser.status });
          }
        });

      }
    });
  }

});

app.get("/trial/:level/:sponID", function(req, res){
  if(!req.session.user){
      res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.find({sponsorID: req.params.sponID}, function(err, activeUsers){
          let activePro = [];
          activeUsers.forEach(function(trial){
            if(trial.status === "Active+"){
              activePro.push(trial);
            }
          });
          if(activePro.length === 0){
            res.render("trial", {user: foundUser,level:req.params.level,status: foundUser.status });
          }else{
            res.render("trial", {user: foundUser,level:req.params.level,activePro,status: foundUser.status });
          }
        });

      }
    });
  }
})

app.get("/something-went-wrong", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email:req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        res.render("wrong",{status: foundUser.status});
      }
    })
  }
});

app.get("/naanthaDa", function(req, res){
  if(!req.session.admin){
    res.redirect("/itsOnlyForUAndMe");
  }else{
    User.find({}, function(err, users){
      User.find({status: "Active"}, function(err, active){
        User.find({status: "Active+"}, function(err, activePro){
          const wbUsers = [];
          active.forEach(function(acheived){
            if(acheived.earnings.ri > 199){
              wbUsers.push(acheived);
            }
          });
            Admin.findOne({email: process.env.EMAIL}, function(err, user){
              if(user.withdrawals.length == 0){
                res.render("admin", {users: users.length, active: active.length, wbUsers: wbUsers.length, activePro: activePro.length });
              }else{
                const withdrawals = user.withdrawals;
                res.render("admin", {withdrawals, users: users.length, active: active.length, wbUsers: wbUsers.length, activePro: activePro.length});
              }
            });
        });
      });
    });
  }
});

app.get("/message", function(req, res){
  if(!req.session.user){
    res.redirect('/login');
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.findOne({sponID: foundUser.sponsorID}, function(error, upline){
          User.find({sponsorID: foundUser.sponID}, function(error, users){
            if(users){
              if(users.length != 0){
                 res.render('members', {status: foundUser.status,upline: upline.userID, sponsorID: foundUser.sponsorID, downlines:users});
              }else{
                res.render('members', {status: foundUser.status,upline: upline.userID, sponsorID: foundUser.sponsorID, downlines:users});
              }
            }else{
              res.render('members', {status: foundUser.status,upline: upline.userID, sponsorID: foundUser.sponsorID});
            }
          });
        });
      }
    });
  }
});

app.get("/message/:sponID", function(req, res){
  if(!req.session.user){
    res.redirect('/login');
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.findOne({sponID: req.params.sponID}, function(error, user){
          if(error){
            console.log(error);
          }else{
            if(user){
              var exist = false;
              const chats = [];
              foundUser.message.forEach(function(chat){
                if(chat.sponID == user.sponID){
                  exist = true;
                  chats.push(chat);
                }
              });
              if(exist != false){
                const messages = [];
                foundUser.notification.forEach(function(message){
                  console.log(message.sponID,user.sponID);
                  if(message.sponID != user.sponID){
                    messages.push(message);
                  }
                });
                User.updateOne({email:foundUser.email}, {$set:{notification:messages}}, function(err){
                  if(err){
                    console.log(err);
                  }
                });
                res.render('message', {status: foundUser.status, user:user, chats: chats});
              }else{
                res.render('message', {status: foundUser.status, user:user});
              }
            }
          }
        });
      }
    });
  }
});

app.get("/franchise-wallet", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      const ri = foundUser.earnings.ab.ri;
      const wb = foundUser.earnings.ab.wb;
      const nw = foundUser.earnings.ab.nw;
      const usrID = foundUser.userID;
      if(foundUser.status == 'Active+'){
        if(foundUser.bankDetails){
            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
        }else{
            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
        }
      }else{
        res.redirect("/dashboard");
      }
    });
  }
});

app.get("/crypto-withdraw", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      const ri = foundUser.earnings.ab.ri;
      const wb = foundUser.earnings.ab.wb;
      const nw = foundUser.earnings.ab.nw;
      const usrID = foundUser.userID;
      if(foundUser.status == 'Active+'){
        if(foundUser.bankDetails){
            res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
        }else{
            res.render("crypto-withdrawal", {status: foundUser.status, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
        }
      }else{
        if(foundUser.bankDetails){
            res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails, ri, wb, nw});
        }else{
            res.render("crypto-withdrawal", {status: foundUser.status, ri, wb, nw});
        }
      }
    });
  }
});

app.get('/api/createCharge/:amount',async function(req, res ){
  const amount = req.params.amount;
  const chargeData = {
    name: 'Add balance',
    description: 'Add balance to your franchise wallet',
    local_price: {
      amount: amount,
      currency: 'USD',
    },
    pricing_type: 'fixed_price',
    metadata: {
      email: req.session.user.email,
    },
  };

  const charge = await Charge.create(chargeData);

  res.send(charge);
});

app.get('/api/createPackage', function(req, res ){

  const activate = async function(){

    const chargeData = {
      name: 'Basic plan',
      description: 'ID activation',
      local_price: {
        amount: 25,
        currency: 'USD',
      },
      pricing_type: 'fixed_price',
      metadata: {
        email: req.session.user.email,
      },
    };

    const charge = await Charge.create(chargeData);

    res.send(charge);
  }
  const upgrade = async function(){

    const chargeData = {
      name: 'Intermediate plan',
      description: 'ID upgradation',
      local_price: {
        amount: 50,
        currency: 'USD',
      },
      pricing_type: 'fixed_price',
      metadata: {
        email: req.session.user.email,
      },
    };

    const charge = await Charge.create(chargeData);

    res.send(charge);
  }
  User.findOne({email: req.session.user.email},  function(err, foundUser){
     if(foundUser.status == 'Inactive'){
       activate()
     }
     if(foundUser.status == 'Active'){
       upgrade()
     }

  });

});

app.get("/auth", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        res.render("auth", {user: foundUser,wallet:foundUser.wallet,status: foundUser.status });
      }
    });
  }
});






//Post Requests
app.post("/register", function(req, res){
  let sponsorID = "CR3" + String(Math.floor(Math.random()*99999));
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  // Unique User Id
  User.findOne({sponID: sponsorID}, function(err, foundUser){
    if(err){
      console.log(err);
    } else{
      if(foundUser){
        sponsorID = "CR3" + String(Math.floor(Math.random()*99999));
      }
    }
  });
  const newUser = new User ({
    userID: req.body.user,
    email: req.body.email,
    password: req.body.pass,
    sponsorID: req.body.sponsorID,
    earnings: {
      ri: 0,
      nw: 0,
      wb: 0,
      ab: {
       ri: 0,
       nw: 0,
       wb: 0,
      },
      te: 0
    },
    sponID: sponsorID,
    time: date + "/" + month + "/" + year,
    status: "Inactive"

  });




  User.findOne({email: req.body.email}, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      let d = new Date();
      let year = d.getFullYear();
      let month = d.getMonth() + 1;
      let date = d.getDate();
      let hour = d.getHours() ;
      let minutes = d.getMinutes();
      if(foundUser){
        if(foundUser.email === req.body.email){
          const alert = "User already exist! Please Sign In..."
          const alertType = "danger"
          res.render("register", {alert, alertType});
        } if (foundUser.password !== req.body.re_pass){
          const alert = "Password doesn't match Please try Again."
          const alertType = "warning"
          res.render("register", {alert, alertType});

        }
      }  else {
        if(req.body.pass !== req.body.re_pass){
          const alert = "Password doesn't match, Check the Password and try again."
          const alertType = "warning"
          res.render("register", {alert, alertType});
        } else {
          User.findOne({sponID: req.body.sponsorID}, function(error, user){
            if(user){
              if(user.sponID == req.body.sponsorID){
                const alert = "Successfully created your Account."
                const alertType = "success"
                newUser.save();

                res.render("login", {alert:{alert, alertType}});
              }else{
                const alert = "Invalid sponsor ID, Please Try Again."
                const alertType = "warning"
                res.render("register", {alert, alertType});
              }
            }else{
              const alert = "Invalid sponsor ID, Please Try Again."
              const alertType = "warning"
              res.render("register", {alert, alertType});
            }
          });
        }
      }
    }
  });
  req.session.destroy();
});

app.post("/login", function(req, res){
  const email = req.body.email;
  const password = req.body.your_pass;
  User.findOne({email: email}, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if(foundUser){
        if(foundUser.password === password){
         const user = {
          email: foundUser.email,
          sponID: foundUser.sponID,
          sponsorID: foundUser.sponsorID
        };
        if(req.body.check == 'on'){
          req.session.login = {
            email: req.body.email,
            password: req.body.your_pass
          }
        }
          req.session.user = user;
          res.redirect("/dashboard");

        } else{
          res.render("login", {alert: {alert: "Password did not match, Try Again",alertType: "danger"}});
        }
      } else{
        res.render("login", {alert: {alert: "Email doesn't exist, Create an Account",alertType: "danger"}});
      }
    }
  });
});

app.post("/withdraw", function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      let d = new Date();
      let year = d.getFullYear();
      let month = d.getMonth() + 1;
      let date = d.getDate();
      let hour = d.getHours() ;
      let minutes = d.getMinutes();
      const currentTime = hour + ":" + minutes;
      const currentDate =  date + "/" + month + "/" + year;
      const usrID = foundUser.userID;
      const ri = foundUser.earnings.ab.ri;
      const wb = foundUser.earnings.ab.wb;
      const nw = foundUser.earnings.ab.nw;
      const rii = foundUser.earnings.ri;
      const amount = Number(req.body.amount);
      const type = req.body.type;

        if(type == 'referral'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              if(foundUser.status == 'Active+'){
                if(foundUser.bankDetails){
                    res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }else{
                    res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }
              }else{
                if(foundUser.bankDetails){
                    res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                }else{
                    res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                }
              }
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const rii = foundUser.earnings.ri;
                if(ri< req.body.amount){
                    const alert = "Low Balance, please try again."
                    const alertType = "warning"

                    if(foundUser.status == 'Active+'){
                      if(foundUser.bankDetails){
                          res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }else{
                          res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }
                    }else{
                      if(foundUser.bankDetails){
                          res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                      }else{
                          res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                      }
                    }
                  }else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.ri - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });
                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'referral',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'referral',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      if(user.status == "Active"){
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot: user.earnings.ab.ot,oa: user.earnings.ab.oa, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri,oa: user.earnings.oa,ot: user.earnings.ot, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }

                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: user.bankDetails.accountNumber,
                          ifsc: user.bankDetails.ifsc,
                          amount: req.body.amount,
                          bankName: user.bankDetails.bankName,
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)


                      // create reusable transporter object using the default SMTP transport
                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"
                      if(foundUser.status == 'Active+'){
                        if(foundUser.bankDetails){
                            res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }else{
                            res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }
                      }else{
                        if(foundUser.bankDetails){
                            res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                        }else{
                            res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                        }
                      }
                    });
                }

            });
          }
        }
        if(type == 'autobot'){
          if(nw< amount){
            const alert = "Low Balance, please try again."
            const alertType = "danger"

            if(foundUser.status == 'Active+'){
              if(foundUser.bankDetails){
                  res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              }else{
                  res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              }
            }else{
              if(foundUser.bankDetails){
                  res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
              }else{
                  res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
              }
            }

          }else{

              if(rii === 0){
                const alert = "One direct referral is required"
                const alertType = "danger"

                if(foundUser.status == 'Active+'){
                  if(foundUser.bankDetails){
                      res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }else{
                      res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }
                }else{
                  if(foundUser.bankDetails){
                      res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                  }else{
                      res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                  }
                }
              }
              else{
                if(req.body.amount < 2){
                  const alert = "Amount is less than minimum withdrawal "
                  const alertType = "warning"

                  if(foundUser.status == 'Active+'){
                    if(foundUser.bankDetails){
                        res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }else{
                        res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }
                  }else{
                    if(foundUser.bankDetails){
                        res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                    }else{
                        res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                    }
                  }

                }else{
                    User.findOne({email: req.session.user.email}, function(err, user){

                        const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                        const newValue = user.earnings.ab.nw - req.body.amount;
                        const history = user.history;
                        const newHistory = {
                          alertType: "warning",
                          status: "Pending",
                          amount: req.body.amount,
                          time: currentTime + ", " + currentDate,
                          payment_id: random
                        };
                        history.push(newHistory);
                        User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        if(user.transaction){
                          const transaction = user.transaction;
                          const newTran = {
                            type: 'autobot',
                            mode: 'debit',
                            amount: req.body.amount,
                            date: currentDate
                          };
                          transaction.push(newTran);
                          User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          const newTran = {
                            type: 'autobot',
                            mode: 'debit',
                            amount: req.body.amount,
                            date: currentDate
                          };
                          User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }
                        if(user.status == "Active"){
                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }


                        Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                          const withdrawal = foundUser.withdrawals;
                          const newWithdraw = {
                            name: user.bankDetails.name,
                            email: user.email,
                            accountNumber: user.bankDetails.accountNumber,
                            ifsc: user.bankDetails.ifsc,
                            amount: req.body.amount,
                            bankName: user.bankDetails.bankName,
                            date: currentTime + ", " + currentDate,
                            payment_id: random,
                            from: type
                          }
                          withdrawal.push(newWithdraw);
                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        });
                        var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                        fast2sms.sendMessage(options)

                        const transporter = nodemailer.createTransport({
                          host: 'smtp.gmail.com',
                          port: 465,
                          secure: true,
                          auth: {
                            user: process.env.SEND_EMAIL, // generated ethereal user
                            pass: process.env.REAL_PASSWORD, // generated ethereal password
                          },
                        });

                        // send mail with defined transport object
                        const mailOptions ={
                          from: process.env.SEND_EMAIL, // sender address
                          to: process.env.WITHDRAW, // list of receivers
                          subject: "NEW WITHDRAWAL REQUEST", // Subject line
                          text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                        }
                        transporter.sendMail(mailOptions, function(err, info){
                          if(err){
                            console.log(err);
                          }
                        });


                        const alert = "Withdrawal success"
                        const alertType = "success"

                        if(foundUser.status == 'Active+'){
                          if(foundUser.bankDetails){
                              res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                          }else{
                              res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                          }
                        }else{
                          if(foundUser.bankDetails){
                              res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                          }else{
                              res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                          }
                        }
                      });
                  }
                }
          }
        }
        if(type == 'superUser'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, usrID, ri, wb, nw});
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;

              if(wb< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                if(foundUser.status == 'Active+'){
                  if(foundUser.bankDetails){
                      res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }else{
                      res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }
                }else{
                  if(foundUser.bankDetails){
                      res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                  }else{
                      res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                  }
                }
              }else{
                if(!foundUser.bankDetails){
                  const alert = "Please provide your bank details"
                  const alertType = "danger"

                  if(foundUser.status == 'Active+'){
                    if(foundUser.bankDetails){
                        res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }else{
                        res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }
                  }else{
                    if(foundUser.bankDetails){
                        res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                    }else{
                        res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                    }
                  }
                } else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.wb - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'level',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'level',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      if(user.status == "Active"){
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri,ot:user.earnings.ot,oa:user.earnings.oa, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }

                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: user.bankDetails.accountNumber,
                          ifsc: user.bankDetails.ifsc,
                          amount: req.body.amount,
                          bankName: user.bankDetails.bankName,
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)

                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"

                      if(foundUser.status == 'Active+'){
                        if(foundUser.bankDetails){
                            res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }else{
                            res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }
                      }else{
                        if(foundUser.bankDetails){
                            res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                        }else{
                            res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                        }
                      }
                    });
                }
              }
            });
          }
        }
        if(type == 'trial'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const ot = foundUser.earnings.ab.ot;
              const oa = foundUser.earnings.ab.oa;

              if(ot< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
             }else{
                if(!foundUser.bankDetails){
                  const alert = "Please provide your bank details"
                  const alertType = "danger"

                  res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              } else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.ot - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'trial',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'trial',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:newValue,oa:user.earnings.ab.oa}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });


                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: user.bankDetails.accountNumber,
                          ifsc: user.bankDetails.ifsc,
                          amount: req.body.amount,
                          bankName: user.bankDetails.bankName,
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)

                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"

                      res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});

                    });
                }
              }
            });
          }

        }
        if(type == 'arc'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
          });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const ot = foundUser.earnings.ab.ot;
              const oa = foundUser.earnings.ab.oa;

              if(oa< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
            }else{
                if(!foundUser.bankDetails){
                  const alert = "Please provide your bank details"
                  const alertType = "danger"

                  res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              } else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.oa - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random,
                        from: type
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'arc',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'arc',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:user.earnings.ab.ot,oa:newValue}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });


                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: user.bankDetails.accountNumber,
                          ifsc: user.bankDetails.ifsc,
                          amount: req.body.amount,
                          bankName: user.bankDetails.bankName,
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)

                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"

                      res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});

                    });
                }
              }
            });
          }

        }


    });
  }
});

app.post("/bank-details", function(req, res){
  const bank = {
    accountNumber: req.body.accountNumber,
    name: req.body.name,
    ifsc: req.body.ifsc,
    bankName: req.body.bankName
  }
  if(req.body.accountNumber === req.body.reAccountNumber){
    User.updateOne({email: req.session.user.email}, {$set:{bankDetails: bank}}, function(err){
      if(err){
        console.log(err);
      }
    });
    res.redirect("/dashboard");
  }else{
    User.findOne({email: req.session.user.email}, function(err, user){
      const alert = "Account number don't match, Try Again"
      const alertType = "alert-warning"
      const usrID = user.userID;
      res.render("bank-details3", {alert, alertType, usrID});
    });
  }
});

app.post("/credit", function(req, res){

  User.findOne({email: req.body.email}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      let d = new Date();
      let year = d.getFullYear();
      let month = d.getMonth() + 1;
      let date = d.getDate();
      let hour = d.getHours() ;
      let minutes = d.getMinutes();
      const currentDate =  date + "/" + month + "/" + year;
      if(foundUser){
        const amount = Number(req.body.amount);
        if(req.body.success == 'yes'){
          const existing = [];
          foundUser.history.forEach(function(payment){
            if(payment.payment_id === req.body.payment_id){
              const newStatus = {
                alertType: "success",
                status: "Success",
                amount: req.body.amount,
                time: req.body.time,
                payment_id: req.body.payment_id
              }
              existing.push(newStatus);
            }else {
              existing.push(payment);
            }
          });
           User.updateOne( { email: foundUser.email},  {$set:{history:existing}}, {history: [{payment_id: req.body.payment_id}]},  function(err){
             if(err){
               console.log(err);

             }
           });
           Admin.findOne({email:process.env.EMAIL}, function(err, admin){
             var today = false;
             const leftOver = [];

             admin.withdrawals.forEach(function(pending){
               if(pending.payment_id !== req.body.payment_id ){
                 leftOver.push(pending)
               }
             });
             admin.report.forEach(function(report){
               if(report.date == currentDate){
                 today = true;
               }
             });

             if(today == true){
               let report1 = [];
               admin.report.forEach(function(report){
                 if(report.date == currentDate){
                   const newValue = {
                     date: report.date,
                     amount: report.amount + amount
                   }
                   report1.push(newValue);
                 }else{
                   report1.push(report);
                 }
               });
               Admin.updateOne({email: process.env.EMAIL}, {$set:{report:report1}}, function(err){
                 if(err){
                   console.log(err);
                 }
               });
             }else{
               let report1 = admin.report;
               const newValue = {
                 date: currentDate,
                 amount: amount
               }
               report1.push(newValue);
               Admin.updateOne({email: process.env.EMAIL}, {$set:{report:report1}}, function(err){
                 if(err){
                   console.log(err);
                 }
               });
             }
             Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:leftOver}}, function(err){
               if(err){
                 console.log(err);
               }
             });
           });
           res.redirect("/naanthaDa");
        }else{
          const existing = [];
          const from = req.body.from;
          foundUser.history.forEach(function(payment){
            if(payment.payment_id === req.body.payment_id){
              const newStatus = {
                alertType: "danger",
                status: "Failed",
                amount: req.body.amount,
                time: req.body.time,
                payment_id: req.body.payment_id
              }
              existing.push(newStatus);
            }else {
              existing.push(payment);
            }
          });
           User.updateOne( { email: foundUser.email},  {$set:{history:existing}}, {history: [{payment_id: req.body.payment_id}]},  function(err){
             if(err){
               console.log(err);

             }
           });
           if(from == 'referral'){
             const newValue = foundUser.earnings.ab.ri + amount;
             if(foundUser.status == "Active"){
               User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: foundUser.earnings.ab.nw, ri: newValue, wb:foundUser.earnings.ab.wb}, te: foundUser.earnings.te, ri: foundUser.earnings.ri, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
                 if(err){
                   console.log(err);
                 }else{
                   console.log(from);
                 }
               });
             }else{
               User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: foundUser.earnings.ab.nw,ot: foundUser.earnings.ab.ot,oa: foundUser.earnings.ab.oa, ri: newValue, wb:foundUser.earnings.ab.wb}, te: foundUser.earnings.te, ri: foundUser.earnings.ri,oa: foundUser.earnings.oa,ot: foundUser.earnings.ot, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
                 if(err){
                   console.log(err);
                 }else{
                   console.log(from);
                 }
               });
             }
           }
           if(from == 'autobot'){
             const newValue = foundUser.earnings.ab.nw + amount;
             if(foundUser.status == "Active"){
               User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: newValue, ri: foundUser.earnings.ab.ri, wb: foundUser.earnings.ab.wb}, te: foundUser.earnings.te, ri: foundUser.earnings.ri, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
                 if(err){
                   console.log(err);
                 }
               });
             }else{
               User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: newValue,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa, ri: foundUser.earnings.ab.ri, wb: foundUser.earnings.ab.wb}, te: foundUser.earnings.te,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, ri: foundUser.earnings.ri, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
                 if(err){
                   console.log(err);
                 }
               });
             }
           }
           if(from == 'superUser'){
             const newValue = foundUser.earnings.ab.wb + amount;
             if(foundUser.status == "Active"){
               User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: foundUser.earnings.ab.nw, ri: foundUser.earnings.ab.ri, wb: newValue}, te: foundUser.earnings.te, ri: foundUser.earnings.ri, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
                 if(err){
                   console.log(err);
                 }
               });
             }else{
               User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: foundUser.earnings.ab.nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa, ri: foundUser.earnings.ab.ri, wb: newValue}, te: foundUser.earnings.te, ri: foundUser.earnings.ri,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
                 if(err){
                   console.log(err);
                 }
               });
             }
           }
           if(from == 'trial'){
             const newValue = foundUser.earnings.ab.ot + amount;
             User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: foundUser.earnings.ab.nw, ri: foundUser.earnings.ab.ri, wb: foundUser.earnings.ab.wb,ot:newValue,oa:foundUser.earnings.ab.oa}, te: foundUser.earnings.te,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, ri: foundUser.earnings.ri, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
               if(err){
                 console.log(err);
               }
             });
           }
           if(from == 'arc'){
             const newValue = foundUser.earnings.ab.oa + amount;
             User.updateOne({email: foundUser.email}, {$set:{earnings:{ab:{nw: foundUser.earnings.ab.nw, ri: foundUser.earnings.ab.ri, wb: foundUser.earnings.ab.wb,ot:foundUser.earnings.ab.ot,oa:newValue}, te: foundUser.earnings.te,ot:foundUser.earnings.ot,oa:foundUser.earnings.oa, ri: foundUser.earnings.ri, nw: foundUser.earnings.nw, wb: foundUser.earnings.wb}}}, function(err){
               if(err){
                 console.log(err);
               }
             });

           }
           Admin.findOne({email:process.env.EMAIL}, function(err, admin){
             const leftOver = [];

             admin.withdrawals.forEach(function(pending){
               if(pending.payment_id !== req.body.payment_id ){
                 leftOver.push(pending)
               }
             });
             Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:leftOver}}, function(err){
               if(err){
                 console.log(err);
               }
             });
           });
           res.redirect("/naanthaDa");
        }

      }else{
        res.redirect("/naanthaDa");
      }
    }
  });
});

app.post("/adminPanel", function(req, res){
  Admin.findOne({email: req.body.email}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        if(process.env.PASS === req.body.your_pass){
          req.session.admin = {
            email: process.env.EMAIL
          }
            res.redirect("/naanthaDa");
        }else{
          res.redirect("/itsOnlyForUAndMe");
        }

      }else{
        res.redirect("/itsOnlyForUAndMe");
      }
    }
  });
});

app.post("/users", function(req, res){
  if(!req.session.admin){
    res.redirect("/itsOnlyForUAndMe");
  }else {
    if(req.body.users == 'all'){
      User.find({time: req.body.date}, function(err, users){
        if(err){
          console.log(err);
        }else{
          res.render("users", {users})
        }
      });
    }else{
      User.find({time: req.body.date}, function(err, users){
        if(err){
          console.log(err);
        }else{
          let acTive =[];
          users.forEach(function(active){
            if(active.status == 'Active' || active.status == 'Active+'){
              acTive.push(active);
            }
          });
          res.render("users", {acTive});
        }
      });
    }
  }
});

app.post("/global-cred", function(req, res){
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;
  if(!req.session.admin){
    res.redirect("/itsOnlyForUAndMe");
  }else{
    User.findOne({email: req.body.email}, function(err, user){
      if(user.status === "Active"){
        if(req.body.amount === "2"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw +2, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+2, ri: user.earnings.ri, nw: user.earnings.nw+2, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-1',
              mode: 'credit',
              amount: '2',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-1',
              mode: 'credit',
              amount: '2',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "4"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+4, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+4, ri: user.earnings.ri, nw: user.earnings.nw+4, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-2',
              mode: 'credit',
              amount: '4',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-4',
              mode: 'credit',
              amount: '2',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "8"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+8, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+8, ri: user.earnings.ri, nw: user.earnings.nw+8, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-3',
              mode: 'credit',
              amount: '8',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-3',
              mode: 'credit',
              amount: '8',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "16"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+16, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+16, ri: user.earnings.ri, nw: user.earnings.nw+16, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-4',
              mode: 'credit',
              amount: '16',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-4',
              mode: 'credit',
              amount: '16',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "32"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+32, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+32, ri: user.earnings.ri, nw: user.earnings.nw+32, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });

          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-5',
              mode: 'credit',
              amount: '32',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-5',
              mode: 'credit',
              amount: '32',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "64"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+64, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+64, ri: user.earnings.ri, nw: user.earnings.nw+64, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-6',
              mode: 'credit',
              amount: '64',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-6',
              mode: 'credit',
              amount: '64',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "128"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+128, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+128, ri: user.earnings.ri, nw: user.earnings.nw+128, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-7',
              mode: 'credit',
              amount: '128',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-7',
              mode: 'credit',
              amount: '128',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "256"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+256, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+256, ri: user.earnings.ri, nw: user.earnings.nw+256, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-8',
              mode: 'credit',
              amount: '256',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-8',
              mode: 'credit',
              amount: '256',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "512"){
          User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+512, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb}, te: user.earnings.te+512, ri: user.earnings.ri, nw: user.earnings.nw+512, wb: user.earnings.wb}}}, function(err){
            if(err){
              console.log(err);
            }
          });
          if(user.transaction){
            const transaction = user.transaction;
            const newTran = {
              type: 'autobot-9',
              mode: 'credit',
              amount: '512',
              date: updated
            };
            transaction.push(newTran);
            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }else{
            const newTran = {
              type: 'autobot-9',
              mode: 'credit',
              amount: '512',
              date: updated
            };
            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
              if(err){
                console.log(err);
              }
            });
          }
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }
        if(req.body.amount === "3"){
          User.find({time: user.time}, function(err, users){
            if(err){
              console.log(err);
            }else{
              let acTive =[];
              users.forEach(function(active){
                if(active.status != 'Inactive'){
                  acTive.push(active);
                }
              });
              res.render("users", {acTive});
            }
          });
        }

      }

      if(user.status === "Active+"){
          if(req.body.amount === "2"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw +2, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+2, ri: user.earnings.ri, nw: user.earnings.nw+2, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-1',
                mode: 'credit',
                amount: '2',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-1',
                mode: 'credit',
                amount: '2',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "4"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+4, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+4, ri: user.earnings.ri, nw: user.earnings.nw+4, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-2',
                mode: 'credit',
                amount: '4',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-4',
                mode: 'credit',
                amount: '2',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "8"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+8, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+8, ri: user.earnings.ri, nw: user.earnings.nw+8, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-3',
                mode: 'credit',
                amount: '8',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-3',
                mode: 'credit',
                amount: '8',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "16"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+16, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+16, ri: user.earnings.ri, nw: user.earnings.nw+16, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-4',
                mode: 'credit',
                amount: '16',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-4',
                mode: 'credit',
                amount: '16',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "32"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+32, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+32, ri: user.earnings.ri, nw: user.earnings.nw+32, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });

            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-5',
                mode: 'credit',
                amount: '32',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-5',
                mode: 'credit',
                amount: '32',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "64"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+64, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+64, ri: user.earnings.ri, nw: user.earnings.nw+64, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-6',
                mode: 'credit',
                amount: '64',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-6',
                mode: 'credit',
                amount: '64',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "128"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+128, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+128, ri: user.earnings.ri, nw: user.earnings.nw+128, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-7',
                mode: 'credit',
                amount: '128',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-7',
                mode: 'credit',
                amount: '128',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "256"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+256, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+256, ri: user.earnings.ri, nw: user.earnings.nw+256, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-8',
                mode: 'credit',
                amount: '256',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-8',
                mode: 'credit',
                amount: '256',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "512"){
            User.updateOne({email: req.body.email}, {$set:{earnings:{ab:{nw:user.earnings.ab.nw+512, ri:user.earnings.ab.ri, wb:user.earnings.ab.wb, ot: user.earnings.ab.ot, oa: user.earnings.ab.oa}, te: user.earnings.te+512, ri: user.earnings.ri, nw: user.earnings.nw+512, wb: user.earnings.wb, ot: user.earnings.ot, oa: user.earnings.oa}}}, function(err){
              if(err){
                console.log(err);
              }
            });
            if(user.transaction){
              const transaction = user.transaction;
              const newTran = {
                type: 'autobot-9',
                mode: 'credit',
                amount: '512',
                date: updated
              };
              transaction.push(newTran);
              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }else{
              const newTran = {
                type: 'autobot-9',
                mode: 'credit',
                amount: '512',
                date: updated
              };
              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                if(err){
                  console.log(err);
                }
              });
            }
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }
          if(req.body.amount === "3"){
            User.find({time: user.time}, function(err, users){
              if(err){
                console.log(err);
              }else{
                let acTive =[];
                users.forEach(function(active){
                  if(active.status != 'Inactive'){
                    acTive.push(active);
                  }
                });
                res.render("users", {acTive});
              }
            });
          }

        }
    });
  }
});

app.post("/user-detail", function(req, res){
  if(req.body.email !== 'undefined'){
    User.findOne({email:req.body.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else {
        if(foundUser){
          const user = {
           email: foundUser.email,
           sponID: foundUser.sponID,
           sponsorID: foundUser.sponsorID
         };
           req.session.user = user;
           res.redirect("/dashboard");
        } else{
          if(req.body.sponID !== 'undefined'){
            User.findOne({sponID:req.body.sponID}, function(err, foundUser){
              if(err){
                console.log(err);
              }else {
                if(foundUser){
                  const user = {
                   email: foundUser.email,
                   sponID: foundUser.sponID,
                   sponsorID: foundUser.sponsorID
                 };
                   req.session.user = user;
                   res.redirect("/dashboard");
                } else{
                  res.redirect("/naanthaDa");
                }
              }
            });
          }else{
          res.redirect("/naanthaDa");
          }
        }
      }
    });
  }else{
    console.log(req.body);
    User.findOne({sponID:req.body.sponID}, function(err, foundUser){
      if(err){
        console.log(err);
      }else {
        if(foundUser){
          const user = {
           email: foundUser.email,
           sponID: foundUser.sponID,
           sponsorID: foundUser.sponsorID
         };
           req.session.user = user;
           res.redirect("/dashboard");
        } else{
          res.redirect("/naanthaDa");
        }
      }
    });
  }

});

app.post("/arc-team", function(req, res){
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;

  User.findOne({email: req.session.user.email}, function(err, foundUser){
    if(req.body.person1 === "Person 1" || req.body.person2 === "Person 2" || req.body.person3 === "Person 3"){
      //Alert
     res.redirect("/something-went-wrong");
    }else{
      if(req.body.person1 === req.body.person2 || req.body.person1 === req.body.person3 || req.body.person2 === req.body.person3){
        //Alert
        res.redirect("/something-went-wrong");
      }else{
        if(foundUser.status === "Active+"){
          User.findOne({sponID: req.body.person1}, function(err, person1){
            User.findOne({sponID: req.body.person2}, function(err, person2){
              User.findOne({sponID: req.body.person3}, function(err, person3){
                let count = [];
                let newTeam = foundUser.team;
                const newArc = {
                  person1: req.body.person1,
                  person2: req.body.person2,
                  person3: req.body.person3,
                  teamTag: "Arc",
                  number: foundUser.team.length + 1,
                  progress: 20
                }
                newTeam.push(newArc);
                if(person1){
                  if(person1.sponID){
                    User.updateOne({sponID: req.body.person1}, {$set:{vacant: false}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                    count.push(person1);
                  }
                }
                if(person2){
                  if(person2.sponID){
                    User.updateOne({sponID: req.body.person2}, {$set:{vacant: false}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                    count.push(person2);
                  }
                }
                if(person3){
                  if(person3.sponID){
                    User.updateOne({sponID: req.body.person3}, {$set:{vacant: false}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                    count.push(person3);
                  }
                }
                if(count.length === 3){
                  //Arc Team
                  User.updateOne({email: foundUser.email}, {$set:{team: newTeam}}, function(err){
                    if(err){
                      console.log(err);
                    }
                  });
                  User.updateOne({email: foundUser.email}, {$set:{leaderTag: true}}, function(err){
                    if(err){
                      console.log(err);
                    }
                  });
                  //Occupied

                  //Arc Income
                  User.updateOne({email: foundUser.email}, {$set:{earnings:{
                      ab:{
                        ri: foundUser.earnings.ab.ri + 10,
                        wb: foundUser.earnings.ab.wb,
                        nw: foundUser.earnings.ab.nw
                      },
                      te: foundUser.earnings.te + 10,
                      ri: foundUser.earnings.ri + 10,
                      wb: foundUser.earnings.wb,
                      nw: foundUser.earnings.nw
                    }}}, function(err){
                      if(err){
                        console.log(err);
                      }
                  });
                  if(foundUser.transaction){
                    const transaction = foundUser.transaction;
                    const newTran = {
                      type: 'arc-1',
                      mode: 'credit',
                      amount: '10',
                      date: updated
                    };
                    transaction.push(newTran);
                    User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                  }else{
                    const newTran = {
                      type: 'arc-1',
                      mode: 'credit',
                      amount: '10',
                      date: updated
                    };
                    User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                  }
                }
              });
            });
          });
        }



        //Arc Levels
        User.findOne({sponID: foundUser.sponsorID}, function(err, upOne){
          User.findOne({sponID: upOne.sponsorID}, function(error, upTwo){
            //Top 1st level Income
            if(upOne.leaderTag === true){
              upOne.team.forEach(function(team){
                if(team.person1 === foundUser.sponID || team.person2 === foundUser.sponID || team.person3 === foundUser.sponID){
                    User.findOne({sponID: team.person1}, function(error, person1){
                      User.findOne({sponID: team.person2}, function(error, person2){
                        User.findOne({sponID: team.person3}, function(error, person3){
                          let level = [];
                          if(person1.leaderTag === true){
                            person1.team.forEach(function(team){
                              if(team.teamTag === "Arc"){
                                level.push(team);
                              }
                            });
                          }
                          if(person2.leaderTag === true){
                            person2.team.forEach(function(team){
                              if(team.teamTag === "Arc"){
                                level.push(team);
                              }
                            });
                          }
                          if(person3.leaderTag === true){
                            person3.team.forEach(function(team){
                              if(team.teamTag === "Arc"){
                                level.push(team);
                              }
                            });
                          }
                          if(level.length > 2){
                            let newOneTeam = [{
                                  person1: team.person1,
                                  person2: team.person2,
                                  person3: team.person3,
                                  number: team.number,
                                  teamTag: "Arc+",
                                  progress: team.progress + 20
                                }];
                      upOne.team.forEach(function(team){
                        if(team.person1 === foundUser.sponID || team.person2 === foundUser.sponID || team.person3 === foundUser.sponID){
                          //skip
                        }else{
                          let existingUsers = {
                            person1: team.person1,
                            person2: team.person2,
                            person3: team.person3,
                            number: team.number,
                            teamTag: team.teamTag,
                            progress: team.progress
                          }
                          newOneTeam.push(existingUsers);
                        }
                      });
                      User.updateOne({email: upOne.email}, {$set:{team: newOneTeam}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                            User.updateOne({email: upOne.email}, {$set:{earnings:{
                                ab:{
                                  ri: upOne.earnings.ab.ri + 10,
                                  wb: upOne.earnings.ab.wb,
                                  nw: upOne.earnings.ab.nw
                                },
                                te: upOne.earnings.te + 10,
                                ri: upOne.earnings.ri + 10,
                                wb: upOne.earnings.wb,
                                nw: upOne.earnings.nw
                              }}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                            });
                            if(upOne.transaction){
                              const transaction = upOne.transaction;
                              const newTran = {
                                type: 'arc-2',
                                mode: 'credit',
                                amount: '10',
                                date: updated
                              };
                              transaction.push(newTran);
                              User.updateOne({email: upOne.email}, {$set:{transaction:transaction}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }else{
                              const newTran = {
                                type: 'arc-2',
                                mode: 'credit',
                                amount: '10',
                                date: updated
                              };
                              User.updateOne({email: upOne.email}, {$set:{transaction:newTran}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }
                          }
                        });
                      });
                    });
                  }
              });
            }
            //Top 2nd level Income
            if(upOne.leaderTag === true){
              upOne.team.forEach(function(team){
                if(team.person1 === foundUser.sponID || team.person2 === foundUser.sponID || team.person3 === foundUser.sponID){
                  if(team.teamTag === "Arc+"){
                    let arcTeam = {
                      person1: team.person1,
                      person2: team.person2,
                      person3: team.person3,
                    }
                    User.findOne({sponID: team.person1}, function(error, person1){
                      User.findOne({sponID: team.person2}, function(error, person2){
                        User.findOne({sponID: team.person3}, function(error, person3){
                          let level2 = [];
                          if(person1.leaderTag === true){
                            person1.team.forEach(function(personTeam){
                              if(personTeam.teamTag === "Arc" || personTeam.teamTag === "Arc+"){
                                level2.push(personTeam);
                              }
                            });
                          }
                          if(person2.leaderTag === true){
                            person2.team.forEach(function(personTeam){
                              if(personTeam.teamTag === "Arc" || personTeam.teamTag === "Arc+"){
                                level2.push(personTeam);
                              }
                            });
                          }
                          if(person3.leaderTag === true){
                            person3.team.forEach(function(personTeam){
                              if(personTeam.teamTag === "Arc" || personTeam.teamTag === "Arc+"){
                                level2.push(personTeam);
                              }
                            });
                          }
                          if(level2.length >= 2){
                            let newOneTeam = [{
                              person1: team.person1,
                              person2: team.person2,
                              person3: team.person3,
                              number: team.number,
                              teamTag: "C-Arc",
                              progress: team.progress + 20
                            }];
                            upOne.team.forEach(function(team){
                              if(team.person1 === foundUser.sponID || team.person2 === foundUser.sponID || team.person3 === foundUser.sponID){
                                //skip
                              }else{
                                let existingUsers = {
                                  person1: team.person1,
                                  person2: team.person2,
                                  person3: team.person3,
                                  number: team.number,
                                  teamTag: team.teamTag,
                                  progress: team.progress
                                }
                                newOneTeam.push(existingUsers);
                              }
                            });
                            User.updateOne({email: upOne.email}, {$set:{team: newOneTeam}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                            User.updateOne({email: upTwo.email}, {$set:{earnings:{
                                ab:{
                                  ri: upTwo.earnings.ab.ri + 10,
                                  wb: upTwo.earnings.ab.wb,
                                  nw: upTwo.earnings.ab.nw
                                },
                                te: upTwo.earnings.te + 10,
                                ri: upTwo.earnings.ri + 10,
                                wb: upTwo.earnings.wb,
                                nw: upTwo.earnings.nw
                              }}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                            });

                            if(upTwo.transaction){
                              const transaction = upTwo.transaction;
                              const newTran = {
                                type: 'arc-3',
                                mode: 'credit',
                                amount: '10',
                                date: updated
                              };
                              transaction.push(newTran);
                              User.updateOne({email: upTwo.email}, {$set:{transaction:transaction}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }else{
                              const newTran = {
                                type: 'arc-3',
                                mode: 'credit',
                                amount: '10',
                                date: updated
                              };
                              User.updateOne({email: upTwo.email}, {$set:{transaction:newTran}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }
                          }
                        });
                      });
                    });

                  }
                }
              })
            }
          });
        });
        res.redirect("/dashboard");
      }
    }
  });
});

app.post("/report", function(req, res){
  User.find({}, function(err, users){
    User.find({status: "Active"}, function(err, active){
      User.find({status: "Active+"}, function(err, activePro){
        Admin.findOne({email: process.env.EMAIL}, function(err, user){
          const usersD = [];
          const activeD = [];
          const acTiveD = [];
          users.forEach(function(date){
            if(date.time == req.body.date){
              usersD.push(date);
            }
          });
          active.forEach(function(date){
            if(date.time == req.body.date){
              activeD.push(date);
            }
          });
          activePro.forEach(function(date){
            if(date.time == req.body.date){
              acTiveD.push(date);
            }
          });
          if(user.report){
            res.render("report", {users: usersD.length,report:user.report,date:req.body.date, active: activeD.length, activePro: acTiveD.length });
          }else{
            res.render("report", { users: usersD.length, active: activeD.length,date:req.body.date, activePro: acTiveD.length});
          }
        });
      });
    });
  });
});

app.post("/send", function(req, res){
  if(!req.session.user){
    res.redirect('/login');
  }else{
    let d = new Date();
    let year = d.getFullYear();
    let month = d.getMonth() + 1;
    let date = d.getDate();
    let hour = d.getHours() ;
    let minutes = d.getMinutes();
    const currentDate = date + "/" + month + "/" + year;
    User.findOne({email: req.session.user.email}, function(err, from){
      User.findOne({sponID: req.body.sponID}, function(error, to){
        // For FPP conversations
        var exist = false;
        from.message.forEach(function(message){
          if(message.sponID == req.body.sponID){
            exist = true;
          }
        });
        if(exist == true){
          const messages = [];

          from.message.forEach(function(message){
            if(message.sponID == to.sponID){
              const conversations = message;
              const newConv = {
                from: req.body.message,
                date: currentDate
              }
              conversations.message.push(newConv);
              messages.push(conversations);
            }else{
              messages.push(message);
            }
          });
          console.log(messages);
          User.updateOne({email: req.session.user.email}, {$set:{message:messages}}, function(err){
            if(err){
              console.log(err);
            }
          });
        }else{
          const messages = from.message;
          const newConv = {
            sponID: req.body.sponID,
            message:[{
              from: req.body.message,
              date: currentDate
            }]
          }
          messages.push(newConv);

          User.updateOne({email: from.email}, {$set:{message:messages}}, function(err){
            if(err){
              console.log(err);
            }
          });
        }// For TPP conversations
        var exist2 = false;
        to.message.forEach(function(message){
          if(message.sponID == from.sponID){
            exist2 = true;
          }
        });
        if(exist2 == true){
          let n1 = false;
          const messages = [];
          const notification = [];
          to.message.forEach(function(message){
            if(message.sponID == from.sponID){
              const conversations = {
                sponID: from.sponID,
                message: message.message
              };
              const newConv = {
                to: req.body.message,
                date: currentDate
              }
              conversations.message.push(newConv);
              messages.push(conversations);
            }else{
              messages.push(message);
            }
          });
          to.notification.forEach(function(notify){
            if(notify.sponID != from.sponID){
                notification.push(notify);
            }else{
               n1 = true;
               notification.push(notify);
            }
          });
          if(n1 == false){
            const newNotify = {
              sponID: from.sponID,
              userID: from.userID
            }
            notification.push(newNotify);
          }
          User.updateOne({email: to.email}, {$set:{message:messages}}, function(err){
            if(err){
              console.log(err);
            }
          });
          User.updateOne({email: to.email}, {$set:{notification:notification}}, function(err){
            if(err){
              console.log(err);
            }
          });
        }else{
          let n1 = false;
          const notification = [];
          const messages = to.message;
          const newConv = {
            sponID: from.sponID,
            message:[{
              to: req.body.message,
              date: currentDate
            }]
          }
          messages.push(newConv);

          to.notification.forEach(function(notify){
            if(notify.sponID != from.sponID){
                notification.push(notify);
            }else{
               n1 = true;
               notification.push(notify);
            }
          });
          if(n1 == false){
            const newNotify = {
              sponID: from.sponID,
              userID: from.userID
            }
            notification.push(newNotify);
          }
          User.updateOne({email: to.email}, {$set:{notification:notification}}, function(err){
            if(err){
              console.log(err);
            }
          });
          User.updateOne({email: to.email}, {$set:{message:messages}}, function(err){
            if(err){
              console.log(err);
            }
          });
        }

      });
    });
    res.redirect("/message/"+req.body.sponID);
  }
});

app.post("/verify-payment", function(req, res){
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;
  const rawBody = req.rawBody;
  const signature = req.headers['x-cc-webhook-signature'];
  const webhookSecret = process.env.END_POINT;
  let body = req.body["event"]
  const amount = body.data.pricing.local.amount;
  const name = body.data.name;
  const email = body.data.metadata.email;


  try {
  const event = Webhook.verifyEventBody(JSON.stringify(req.body), signature, webhookSecret);

  if (event.type === 'charge:confirmed') {
    // TODO
    // all good, charge confirmed
    if(name == 'Add balance'){
        Order.findOne({id:body.data.id}, function(err, foundPayment){
          if(err){

          }else{
            if(!foundPayment){
              User.findOne({email:email}, function(err, foundUser){
                if(err){
                  console.log(err)
                }else{
                  if(foundUser){
                    const addAmount = parseInt(amount)
                    User.updateOne({email:email}, {$set:{wallet: foundUser.wallet + addAmount}}, function(error){
                      if(error){
                        console.log(error);
                      }else{
                        const newOrder = new Order ({
                          email: body.data.metadata.email,
                          data: body.data,
                          checkout: body.data.checkout,
                          id: body.data.id,
                          type: body.type,
                          token: 'Invalid'
                        });
                        newOrder.save();

                        if(foundUser.transaction){
                          const transaction = foundUser.transaction;
                          const newTran = {
                            type: 'wallet',
                            mode: 'credit',
                            amount: amount,
                            date: updated
                          };
                          transaction.push(newTran);
                          User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          const newTran = {
                            type: 'wallet',
                            mode: 'credit',
                            amount: amount,
                            date: updated
                          };
                          User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }

                      }
                    })
                  }
                }
              });

            }else{
              if(foundPayment.type == 'charge:pending'){
                User.findOne({email:email}, function(err, foundUser){
                  if(err){
                    console.log(err)
                  }else{
                    if(foundUser){
                      const addAmount = parseInt(amount)
                      User.updateOne({email:email}, {$set:{wallet: foundUser.wallet + addAmount}}, function(error){
                        if(error){
                          console.log(error);
                        }else{
                          Order.updateOne({id:foundPayment.data.id}, {$set:{type:'charge:confirmed'}}, function(error){
                            if(error){
                              console.log(error);
                            }
                          });

                          if(foundUser.transaction){
                            const transaction = foundUser.transaction;
                            const newTran = {
                              type: 'wallet',
                              mode: 'credit',
                              amount: parseInt(amount),
                              date: updated
                            };
                            transaction.push(newTran);
                            User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }else{
                            const newTran = {
                              type: 'wallet',
                              mode: 'credit',
                              amount: parseInt(amount),
                              date: updated
                            };
                            User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }

                        }
                      })
                    }
                  }
                });

              }
            }
          }
        });
    }else{
    if(amount == "25.00" || amount == "50.00"){

      User.findOne({email: email}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          if(foundUser){
            if(amount == "25.00"){
              if(foundUser.status == 'Inactive'){
                //For Basic Plan
                User.updateOne({email: email},{$set:{status: "Active"}}, function(err){
                  if(err){
                    console.log(err);
                  }else{
                    const newOrder = new Order ({
                      email: body.data.metadata.email,
                      data: body.data,
                      checkout: body.data.checkout,
                      id: body.data.id,
                      type: body.type,
                      token: 'Invalid'
                    });
                    newOrder.save();
                  }
                });
                User.updateOne({email: email},{$set:{time: updated }}, function(err){
                  if(err){
                    console.log(err);
                  }
                });

                //  Referral points
                User.findOne({sponID: foundUser.sponsorID}, function(err, sponUser){
                  if(err){
                    console.log(err);
                  } else {
                    if(sponUser){
                      if(sponUser.status == "Active"){
                        User.updateOne({sponID: foundUser.sponsorID},
                          {$set:{earnings:{
                            ab:{
                              ri: sponUser.earnings.ab.ri + 10,
                              wb: sponUser.earnings.ab.wb,
                              nw: sponUser.earnings.ab.nw
                            },
                            te: sponUser.earnings.te + 10,
                            ri: sponUser.earnings.ri + 10,
                            wb: sponUser.earnings.wb,
                            nw: sponUser.earnings.nw
                          }}},  function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        if(sponUser.transaction){
                          const transaction = sponUser.transaction;
                          const newTran = {
                            type: 'referral',
                            mode: 'credit',
                            amount: '10',
                            date: updated
                          };
                          transaction.push(newTran);
                          User.updateOne({email: sponUser.email}, {$set:{transaction:transaction}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          const newTran = {
                            type: 'referral',
                            mode: 'credit',
                            amount: '10',
                            date: updated
                          };
                          User.updateOne({email: sponUser.email}, {$set:{transaction:newTran}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }

                    }else{
                      if(sponUser.status == "Active+"){
                        User.updateOne({sponID: foundUser.sponsorID},
                          {$set:{earnings:{
                            ab:{
                              ri: sponUser.earnings.ab.ri + 10,
                              wb: sponUser.earnings.ab.wb,
                              nw: sponUser.earnings.ab.nw,
                              ot: sponUser.earnings.ab.ot,
                              oa: sponUser.earnings.ab.oa
                            },
                            te: sponUser.earnings.te + 10,
                            ri: sponUser.earnings.ri + 10,
                            wb: sponUser.earnings.wb,
                            nw: sponUser.earnings.nw,
                            ot: sponUser.earnings.ot,
                            oa: sponUser.earnings.oa
                          }}},  function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        if(sponUser.transaction){
                          const transaction = sponUser.transaction;
                          const newTran = {
                            type: 'referral',
                            mode: 'credit',
                            amount: '10',
                            date: updated
                          };
                          transaction.push(newTran);
                          User.updateOne({email: sponUser.email}, {$set:{transaction:transaction}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          const newTran = {
                            type: 'referral',
                            mode: 'credit',
                            amount: '10',
                            date: updated
                          };
                          User.updateOne({email: sponUser.email}, {$set:{transaction:newTran}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }
                      }
                    }

                     //  level poinst
                       User.findOne({sponID: sponUser.sponsorID}, function(err, firstUser){
                       if(err){
                         console.log(err);
                       } else {
                         if(firstUser){
                           if(firstUser.status === "Active+"){
                             User.updateOne({sponID: sponUser.sponsorID},
                               {$set:{earnings:{
                                 ab:{
                                   ri: firstUser.earnings.ab.ri,
                                   wb: firstUser.earnings.ab.wb + 0.5,
                                   nw: firstUser.earnings.ab.nw,
                                   ot: firstUser.earnings.ab.ot,
                                   oa: firstUser.earnings.ab.oa
                                 },
                                 te: firstUser.earnings.te + 0.5,
                                 ri: firstUser.earnings.ri,
                                 wb: firstUser.earnings.wb + 0.5,
                                 nw: firstUser.earnings.nw,
                                 ot: firstUser.earnings.ot,
                                 oa: firstUser.earnings.oa
                               }}},  function(err){
                               if(err){
                                 console.log(err);
                               }
                             });

                             if(firstUser.transaction){
                               const transaction = firstUser.transaction;
                               const newTran = {
                                 type: 'level-1',
                                 mode: 'credit',
                                 amount: '0.5',
                                 date: updated
                               };
                               transaction.push(newTran);
                               User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                 if(err){
                                   console.log(err);
                                 }
                               });
                             }else{
                               const newTran = {
                                 type: 'level-1',
                                 mode: 'credit',
                                 amount: '0.5',
                                 date: updated
                               };
                               User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                 if(err){
                                   console.log(err);
                                 }
                               });
                             }

                           }


                             if(firstUser.status === "Active"){
                               User.updateOne({sponID: sponUser.sponsorID},
                                 {$set:{earnings:{
                                   ab:{
                                     ri: firstUser.earnings.ab.ri,
                                     wb: firstUser.earnings.ab.wb + 0.5,
                                     nw: firstUser.earnings.ab.nw
                                   },
                                   te: firstUser.earnings.te + 0.5,
                                   ri: firstUser.earnings.ri,
                                   wb: firstUser.earnings.wb+ 0.5,
                                   nw: firstUser.earnings.nw
                                 }}},  function(err){
                                 if(err){
                                   console.log(err);
                                 }
                               });

                               if(firstUser.transaction){
                                 const transaction = firstUser.transaction;
                                 const newTran = {
                                   type: 'level-1',
                                   mode: 'credit',
                                   amount: '0.5',
                                   date: updated
                                 };
                                 transaction.push(newTran);
                                 User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                   if(err){
                                     console.log(err);
                                   }
                                 });
                               }else{
                                 const newTran = {
                                   type: 'level-1',
                                   mode: 'credit',
                                   amount: '0.5',
                                   date: updated
                                 };
                                 User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                   if(err){
                                     console.log(err);
                                   }
                                 });
                               }

                             }

                             User.findOne({sponID: firstUser.sponsorID}, function(err, secondUser){
                               if(err){
                                 console.log(err);
                               }else{
                                 if(secondUser){
                                   if(secondUser.status === "Active+"){
                                     User.updateOne({sponID: firstUser.sponsorID},
                                       {$set:{earnings:{
                                         ab:{
                                           ri: secondUser.earnings.ab.ri,
                                           wb: secondUser.earnings.ab.wb + 0.5,
                                           nw: secondUser.earnings.ab.nw,
                                           ot: secondUser.earnings.ab.ot,
                                           oa: secondUser.earnings.ab.oa
                                         },
                                         te: secondUser.earnings.te + 0.5,
                                         ri: secondUser.earnings.ri,
                                         wb: secondUser.earnings.wb + 0.5,
                                         nw: secondUser.earnings.nw,
                                         ot: secondUser.earnings.ot,
                                         oa: secondUser.earnings.oa
                                       }}},  function(err){
                                       if(err){
                                         console.log(err);
                                       }
                                     });

                                     if(secondUser.transaction){
                                       const transaction = secondUser.transaction;
                                       const newTran = {
                                         type: 'level-2',
                                         mode: 'credit',
                                         amount: '0.5',
                                         date: updated
                                       };
                                       transaction.push(newTran);
                                       User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                         if(err){
                                           console.log(err);
                                         }
                                       });
                                     }else{
                                       const newTran = {
                                         type: 'level-2',
                                         mode: 'credit',
                                         amount: '0.5',
                                         date: updated
                                       };
                                       User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                         if(err){
                                           console.log(err);
                                         }
                                       });
                                     }
                                   }

                                   if(secondUser.status === "Active"){
                                       User.updateOne({sponID: firstUser.sponsorID},
                                         {$set:{earnings:{
                                           ab:{
                                             ri: secondUser.earnings.ab.ri,
                                             wb: secondUser.earnings.ab.wb + 0.5,
                                             nw: secondUser.earnings.ab.nw
                                           },
                                           te: secondUser.earnings.te + 0.5,
                                           ri: secondUser.earnings.ri,
                                           wb: secondUser.earnings.wb + 0.5,
                                           nw: secondUser.earnings.nw
                                         }}},  function(err){
                                         if(err){
                                           console.log(err);
                                         }
                                       });

                                       if(secondUser.transaction){
                                         const transaction = secondUser.transaction;
                                         const newTran = {
                                           type: 'level-2',
                                           mode: 'credit',
                                           amount: '0.5',
                                           date: updated
                                         };
                                         transaction.push(newTran);
                                         User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                           if(err){
                                             console.log(err);
                                           }
                                         });
                                       }else{
                                         const newTran = {
                                           type: 'level-2',
                                           mode: 'credit',
                                           amount: '0.5',
                                           date: updated
                                         };
                                         User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                           if(err){
                                             console.log(err);
                                           }
                                         });
                                       }
                                     }

                                     //Third User
                                     User.findOne({sponID:secondUser.sponsorID}, function(err, thirdUser){
                                       if(err){
                                         console.log(err);
                                       }else{
                                         if(thirdUser){
                                           if(thirdUser.status === "Active+"){
                                             User.updateOne({sponID: secondUser.sponsorID},
                                               {$set:{earnings:{
                                                 ab:{
                                                   ri: thirdUser.earnings.ab.ri,
                                                   wb: thirdUser.earnings.ab.wb + 0.5,
                                                   nw: thirdUser.earnings.ab.nw,
                                                   ot: thirdUser.earnings.ab.ot,
                                                   oa: thirdUser.earnings.ab.oa
                                                 },
                                                 te: thirdUser.earnings.te + 0.5,
                                                 ri: thirdUser.earnings.ri,
                                                 wb: thirdUser.earnings.wb + 0.5,
                                                 nw: thirdUser.earnings.nw,
                                                 ot: thirdUser.earnings.ot,
                                                 oa: thirdUser.earnings.oa
                                               }}},  function(err){
                                               if(err){
                                                 console.log(err);
                                               }
                                             });


                                             if(thirdUser.transaction){
                                               const transaction = thirdUser.transaction;
                                               const newTran = {
                                                 type: 'level-3',
                                                 mode: 'credit',
                                                 amount: '0.5',
                                                 date: updated
                                               };
                                               transaction.push(newTran);
                                               User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                 if(err){
                                                   console.log(err);
                                                 }
                                               });
                                             }else{
                                               const newTran = {
                                                 type: 'level-3',
                                                 mode: 'credit',
                                                 amount: '0.5',
                                                 date: updated
                                               };
                                               User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                 if(err){
                                                   console.log(err);
                                                 }
                                               });
                                             }
                                           }

                                           if(thirdUser.status === "Active"){
                                               User.updateOne({sponID: secondUser.sponsorID},
                                                 {$set:{earnings:{
                                                   ab:{
                                                     ri: thirdUser.earnings.ab.ri,
                                                     wb: thirdUser.earnings.ab.wb + 0.5,
                                                     nw: thirdUser.earnings.ab.nw
                                                   },
                                                   te: thirdUser.earnings.te + 0.5,
                                                   ri: thirdUser.earnings.ri,
                                                   wb: thirdUser.earnings.wb + 0.5,
                                                   nw: thirdUser.earnings.nw
                                                 }}},  function(err){
                                                 if(err){
                                                   console.log(err);
                                                 }
                                               });


                                               if(thirdUser.transaction){
                                                 const transaction = thirdUser.transaction;
                                                 const newTran = {
                                                   type: 'level-3',
                                                   mode: 'credit',
                                                   amount: '0.5',
                                                   date: updated
                                                 };
                                                 transaction.push(newTran);
                                                 User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                   if(err){
                                                     console.log(err);
                                                   }
                                                 });
                                               }else{
                                                 const newTran = {
                                                   type: 'level-3',
                                                   mode: 'credit',
                                                   amount: '0.5',
                                                   date: updated
                                                 };
                                                 User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                   if(err){
                                                     console.log(err);
                                                   }
                                                 });
                                               }
                                             }

                                             //Forth User
                                             User.findOne({sponID:thirdUser.sponsorID}, function(err, fourthUser){
                                               if(err){
                                                 console.log(err);
                                               }else{
                                                 if(fourthUser){
                                                   if(fourthUser.status === "Active+"){
                                                     User.updateOne({sponID: thirdUser.sponsorID},
                                                       {$set:{earnings:{
                                                         ab:{
                                                           ri: fourthUser.earnings.ab.ri,
                                                           wb: fourthUser.earnings.ab.wb + 0.5,
                                                           nw: fourthUser.earnings.ab.nw,
                                                           ot: fourthUser.earnings.ab.ot,
                                                           oa: fourthUser.earnings.ab.oa
                                                         },
                                                         te: fourthUser.earnings.te + 0.5,
                                                         ri: fourthUser.earnings.ri,
                                                         wb: fourthUser.earnings.wb + 0.5,
                                                         nw: fourthUser.earnings.nw,
                                                         ot: fourthUser.earnings.ot,
                                                         oa: fourthUser.earnings.oa
                                                       }}},  function(err){
                                                       if(err){
                                                         console.log(err);
                                                       }
                                                     });


                                                     if(fourthUser.transaction){
                                                       const transaction = fourthUser.transaction;
                                                       const newTran = {
                                                         type: 'level-4',
                                                         mode: 'credit',
                                                         amount: '0.5',
                                                         date: updated
                                                       };
                                                       transaction.push(newTran);
                                                       User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                         if(err){
                                                           console.log(err);
                                                         }
                                                       });
                                                     }else{
                                                       const newTran = {
                                                         type: 'level-4',
                                                         mode: 'credit',
                                                         amount: '0.5',
                                                         date: updated
                                                       };
                                                       User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                         if(err){
                                                           console.log(err);
                                                         }
                                                       });
                                                     }
                                                   }


                                                   if(fourthUser.status === "Active"){
                                                       User.updateOne({sponID: thirdUser.sponsorID},
                                                         {$set:{earnings:{
                                                           ab:{
                                                             ri: fourthUser.earnings.ab.ri,
                                                             wb: fourthUser.earnings.ab.wb + 0.5,
                                                             nw: fourthUser.earnings.ab.nw
                                                           },
                                                           te: fourthUser.earnings.te + 0.5,
                                                           ri: fourthUser.earnings.ri,
                                                           wb: fourthUser.earnings.wb + 0.5,
                                                           nw: fourthUser.earnings.nw
                                                         }}},  function(err){
                                                         if(err){
                                                           console.log(err);
                                                         }
                                                       });


                                                       if(fourthUser.transaction){
                                                         const transaction = fourthUser.transaction;
                                                         const newTran = {
                                                           type: 'level-4',
                                                           mode: 'credit',
                                                           amount: '0.5',
                                                           date: updated
                                                         };
                                                         transaction.push(newTran);
                                                         User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                           if(err){
                                                             console.log(err);
                                                           }
                                                         });
                                                       }else{
                                                         const newTran = {
                                                           type: 'level-4',
                                                           mode: 'credit',
                                                           amount: '0.5',
                                                           date: updated
                                                         };
                                                         User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                           if(err){
                                                             console.log(err);
                                                           }
                                                         });
                                                       }
                                                     }

                                                     //fifth User
                                                     User.findOne({sponID:fourthUser.sponsorID}, function(err, fifthUser){
                                                       if(err){
                                                         console.log(err);
                                                       }else{
                                                         if(fifthUser){
                                                           if(fifthUser.status === "Active+"){
                                                             User.updateOne({sponID: fourthUser.sponsorID},
                                                               {$set:{earnings:{
                                                                 ab:{
                                                                   ri: fifthUser.earnings.ab.ri,
                                                                   wb: fifthUser.earnings.ab.wb + 0.5,
                                                                   nw: fifthUser.earnings.ab.nw,
                                                                   ot: fifthUser.earnings.ab.ot,
                                                                   oa: fifthUser.earnings.ab.oa
                                                                 },
                                                                 te: fifthUser.earnings.te + 0.5,
                                                                 ri: fifthUser.earnings.ri,
                                                                 wb: fifthUser.earnings.wb + 0.5,
                                                                 nw: fifthUser.earnings.nw,
                                                                 ot: fifthUser.earnings.ot,
                                                                 oa: fifthUser.earnings.oa
                                                               }}},  function(err){
                                                               if(err){
                                                                 console.log(err);
                                                               }
                                                             });


                                                             if(fifthUser.transaction){
                                                               const transaction = fifthUser.transaction;
                                                               const newTran = {
                                                                 type: 'level-5',
                                                                 mode: 'credit',
                                                                 amount: '0.5',
                                                                 date: updated
                                                               };
                                                               transaction.push(newTran);
                                                               User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                 if(err){
                                                                   console.log(err);
                                                                 }
                                                               });
                                                             }else{
                                                               const newTran = {
                                                                 type: 'level-5',
                                                                 mode: 'credit',
                                                                 amount: '0.5',
                                                                 date: updated
                                                               };
                                                               User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                 if(err){
                                                                   console.log(err);
                                                                 }
                                                               });
                                                             }
                                                           }


                                                           if(fifthUser.status === "Active"){
                                                               User.updateOne({sponID: fourthUser.sponsorID},
                                                                 {$set:{earnings:{
                                                                   ab:{
                                                                     ri: fifthUser.earnings.ab.ri,
                                                                     wb: fifthUser.earnings.ab.wb + 0.5,
                                                                     nw: fifthUser.earnings.ab.nw
                                                                   },
                                                                   te: fifthUser.earnings.te + 0.5,
                                                                   ri: fifthUser.earnings.ri,
                                                                   wb: fifthUser.earnings.wb + 0.5,
                                                                   nw: fifthUser.earnings.nw
                                                                 }}},  function(err){
                                                                 if(err){
                                                                   console.log(err);
                                                                 }
                                                               });


                                                               if(fifthUser.transaction){
                                                                 const transaction = fifthUser.transaction;
                                                                 const newTran = {
                                                                   type: 'level-5',
                                                                   mode: 'credit',
                                                                   amount: '0.5',
                                                                   date: updated
                                                                 };
                                                                 transaction.push(newTran);
                                                                 User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                   if(err){
                                                                     console.log(err);
                                                                   }
                                                                 });
                                                               }else{
                                                                 const newTran = {
                                                                   type: 'level-5',
                                                                   mode: 'credit',
                                                                   amount: '0.5',
                                                                   date: updated
                                                                 };
                                                                 User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                   if(err){
                                                                     console.log(err);
                                                                   }
                                                                 });
                                                               }
                                                             }

                                                             //sixth User
                                                             User.findOne({sponID:fifthUser.sponsorID}, function(err, sixthUser){
                                                               if(err){
                                                                 console.log(err);
                                                               }else{
                                                                 if(sixthUser){
                                                                   if(sixthUser.status === "Active+"){
                                                                     User.updateOne({sponID: fifthUser.sponsorID},
                                                                       {$set:{earnings:{
                                                                         ab:{
                                                                           ri: sixthUser.earnings.ab.ri,
                                                                           wb: sixthUser.earnings.ab.wb + 0.5,
                                                                           nw: sixthUser.earnings.ab.nw,
                                                                           ot: sixthUser.earnings.ab.ot,
                                                                           oa: sixthUser.earnings.ab.oa
                                                                         },
                                                                         te: sixthUser.earnings.te + 0.5,
                                                                         ri: sixthUser.earnings.ri,
                                                                         wb: sixthUser.earnings.wb + 0.5,
                                                                         nw: sixthUser.earnings.nw,
                                                                         ot: sixthUser.earnings.ot,
                                                                         oa: sixthUser.earnings.oa
                                                                       }}},  function(err){
                                                                       if(err){
                                                                         console.log(err);
                                                                       }
                                                                     });


                                                                     if(sixthUser.transaction){
                                                                       const transaction = sixthUser.transaction;
                                                                       const newTran = {
                                                                         type: 'level-6',
                                                                         mode: 'credit',
                                                                         amount: '0.5',
                                                                         date: updated
                                                                       };
                                                                       transaction.push(newTran);
                                                                       User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                         if(err){
                                                                           console.log(err);
                                                                         }
                                                                       });
                                                                     }else{
                                                                       const newTran = {
                                                                         type: 'level-6',
                                                                         mode: 'credit',
                                                                         amount: '0.5',
                                                                         date: updated
                                                                       };
                                                                       User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                         if(err){
                                                                           console.log(err);
                                                                         }
                                                                       });
                                                                     }
                                                                   }


                                                                   if(sixthUser.status === "Active"){
                                                                       User.updateOne({sponID: fifthUser.sponsorID},
                                                                         {$set:{earnings:{
                                                                           ab:{
                                                                             ri: sixthUser.earnings.ab.ri,
                                                                             wb: sixthUser.earnings.ab.wb + 0.5,
                                                                             nw: sixthUser.earnings.ab.nw
                                                                           },
                                                                           te: sixthUser.earnings.te + 0.5,
                                                                           ri: sixthUser.earnings.ri,
                                                                           wb: sixthUser.earnings.wb + 0.5,
                                                                           nw: sixthUser.earnings.nw
                                                                         }}},  function(err){
                                                                         if(err){
                                                                           console.log(err);
                                                                         }
                                                                       });


                                                                       if(sixthUser.transaction){
                                                                         const transaction = sixthUser.transaction;
                                                                         const newTran = {
                                                                           type: 'level-6',
                                                                           mode: 'credit',
                                                                           amount: '0.5',
                                                                           date: updated
                                                                         };
                                                                         transaction.push(newTran);
                                                                         User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                           if(err){
                                                                             console.log(err);
                                                                           }
                                                                         });
                                                                       }else{
                                                                         const newTran = {
                                                                           type: 'level-6',
                                                                           mode: 'credit',
                                                                           amount: '0.5',
                                                                           date: updated
                                                                         };
                                                                         User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                           if(err){
                                                                             console.log(err);
                                                                           }
                                                                         });
                                                                       }
                                                                     }
                                                                 }
                                                               }
                                                             });
                                                         }
                                                       }
                                                     });
                                                 }
                                               }
                                             });
                                         }
                                       }
                                     });
                                 }
                               }
                             });
                         }
                       }
                     });
                     }
                  }
                });


              }else{

                const newOrder = new Order ({
                  email: body.data.metadata.email,
                  data: body.data,
                  checkout: body.data.checkout,
                  id: body.data.id,
                  type: body.type,
                  token: 'Valid'
                });
                newOrder.save();
              }

            }else{
              //For Upgrade Plan
              if(amount == "50.00"){
                if(foundUser.status == 'Active'){
                  User.updateOne({email: foundUser.email},{$set:{status: "Active+"}}, function(err){
                    if(err){
                      console.log(err);
                    }else{

                      const newOrder = new Order ({
                        email: body.data.metadata.email,
                        data: body.data,
                        checkout: body.data.checkout,
                        id: body.data.id,
                        type: body.type,
                        token: 'Invalid'
                      });
                      newOrder.save();
                    }
                  });
                  User.updateOne({email: foundUser.email},{$set:{wallet: 0}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                  User.updateOne({email: foundUser.email},{$set:{earnings:{
                    ab:{
                      ri: foundUser.earnings.ab.ri,
                      wb: foundUser.earnings.ab.wb,
                      nw: foundUser.earnings.ab.nw,
                      ot: 0,
                      oa: 0
                    },
                    te: foundUser.earnings.te,
                    ri: foundUser.earnings.ri,
                    wb: foundUser.earnings.wb,
                    nw: foundUser.earnings.nw,
                    ot: 0,
                    oa: 0
                  }}}, function(err){
                    if(err){
                      console.log(err);
                    }
                  });

                  //  Referral points
                  User.findOne({sponID: foundUser.sponsorID}, function(err, firstUser){
                    if(err){
                      console.log(err);
                    } else {
                      if(firstUser){
                        if(firstUser.status === "Active+"){
                          User.updateOne({sponID: foundUser.sponsorID},
                            {$set:{earnings:{
                              ab:{
                                ri: firstUser.earnings.ab.ri,
                                wb: firstUser.earnings.ab.wb,
                                nw: firstUser.earnings.ab.nw,
                                ot: firstUser.earnings.ab.ot + 10,
                                oa: firstUser.earnings.ab.oa
                              },
                              te: firstUser.earnings.te + 10,
                              ri: firstUser.earnings.ri,
                              wb: firstUser.earnings.wb,
                              nw: firstUser.earnings.nw,
                              ot: firstUser.earnings.ot + 10,
                              oa: firstUser.earnings.oa
                            }}},  function(err){
                            if(err){
                              console.log(err);
                            }
                          });

                          if(firstUser.transaction){
                            const transaction = firstUser.transaction;
                            const newTran = {
                              type: 'trial-1',
                              mode: 'credit',
                              amount: '10',
                              date: updated
                            };
                            transaction.push(newTran);
                            User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }else{
                            const newTran = {
                              type: 'trial-1',
                              mode: 'credit',
                              amount: '10',
                              date: updated
                            };
                            User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }

                        }


                        User.findOne({sponID: firstUser.sponsorID}, function(err, secondUser){
                          if(err){
                            console.log(err);
                          }else{
                            if(secondUser){
                              if(secondUser.status === "Active+"){
                                User.updateOne({sponID: firstUser.sponsorID},
                                  {$set:{earnings:{
                                    ab:{
                                      ri: secondUser.earnings.ab.ri,
                                      wb: secondUser.earnings.ab.wb,
                                      nw: secondUser.earnings.ab.nw,
                                      ot: secondUser.earnings.ab.ot + 10,
                                      oa: secondUser.earnings.ab.oa
                                    },
                                    te: secondUser.earnings.te + 10,
                                    ri: secondUser.earnings.ri,
                                    wb: secondUser.earnings.wb,
                                    nw: secondUser.earnings.nw,
                                    ot: secondUser.earnings.ot + 10,
                                    oa: secondUser.earnings.oa
                                  }}},  function(err){
                                  if(err){
                                    console.log(err);
                                  }
                                });

                                if(secondUser.transaction){
                                  const transaction = secondUser.transaction;
                                  const newTran = {
                                    type: 'trial-2',
                                    mode: 'credit',
                                    amount: '10',
                                    date: updated
                                  };
                                  transaction.push(newTran);
                                  User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                    if(err){
                                      console.log(err);
                                    }
                                  });
                                }else{
                                  const newTran = {
                                    type: 'trial-2',
                                    mode: 'credit',
                                    amount: '10',
                                    date: updated
                                  };
                                  User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                    if(err){
                                      console.log(err);
                                    }
                                  });
                                }
                              }

                              //Third User
                              User.findOne({sponID:secondUser.sponsorID}, function(err, thirdUser){
                                if(err){
                                  console.log(err);
                                }else{
                                  if(thirdUser){
                                    if(thirdUser.status === "Active+"){
                                      User.updateOne({sponID: secondUser.sponsorID},
                                        {$set:{earnings:{
                                          ab:{
                                            ri: thirdUser.earnings.ab.ri,
                                            wb: thirdUser.earnings.ab.wb,
                                            nw: thirdUser.earnings.ab.nw,
                                            ot: thirdUser.earnings.ab.ot + 10,
                                            oa: thirdUser.earnings.ab.oa
                                          },
                                          te: thirdUser.earnings.te + 10,
                                          ri: thirdUser.earnings.ri,
                                          wb: thirdUser.earnings.wb,
                                          nw: thirdUser.earnings.nw,
                                          ot: thirdUser.earnings.ot + 10,
                                          oa: thirdUser.earnings.oa
                                        }}},  function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });


                                      if(thirdUser.transaction){
                                        const transaction = thirdUser.transaction;
                                        const newTran = {
                                          type: 'trial-3',
                                          mode: 'credit',
                                          amount: '10',
                                          date: updated
                                        };
                                        transaction.push(newTran);
                                        User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });
                                      }else{
                                        const newTran = {
                                          type: 'trial-3',
                                          mode: 'credit',
                                          amount: '10',
                                          date: updated
                                        };
                                        User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });
                                      }
                                    }

                                    //Fourth User
                                    User.findOne({sponID:thirdUser.sponsorID}, function(err, fourthUser){
                                      if(err){
                                        console.log(err);
                                      }else{
                                        if(fourthUser){
                                          if(fourthUser.status === "Active+"){
                                            User.updateOne({sponID: thirdUser.sponsorID},
                                              {$set:{earnings:{
                                                ab:{
                                                  ri: fourthUser.earnings.ab.ri,
                                                  wb: fourthUser.earnings.ab.wb,
                                                  nw: fourthUser.earnings.ab.nw,
                                                  ot: fourthUser.earnings.ab.ot + 1,
                                                  oa: fourthUser.earnings.ab.oa
                                                },
                                                te: fourthUser.earnings.te + 1,
                                                ri: fourthUser.earnings.ri,
                                                wb: fourthUser.earnings.wb,
                                                nw: fourthUser.earnings.nw,
                                                ot: fourthUser.earnings.ot + 1,
                                                oa: fourthUser.earnings.oa
                                              }}},  function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });


                                            if(fourthUser.transaction){
                                              const transaction = fourthUser.transaction;
                                              const newTran = {
                                                type: 'network-1',
                                                mode: 'credit',
                                                amount: '1',
                                                date: updated
                                              };
                                              transaction.push(newTran);
                                              User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              const newTran = {
                                                type: 'network-1',
                                                mode: 'credit',
                                                amount: '1',
                                                date: updated
                                              };
                                              User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }
                                          }


                                          //Fifth User
                                          User.findOne({sponID:fourthUser.sponsorID}, function(err, fifthUser){
                                            if(err){
                                              console.log(err);
                                            }else{
                                              if(fifthUser){
                                                if(fifthUser.status === "Active+"){
                                                  User.updateOne({sponID: fourthUser.sponsorID},
                                                    {$set:{earnings:{
                                                      ab:{
                                                        ri: fifthUser.earnings.ab.ri,
                                                        wb: fifthUser.earnings.ab.wb,
                                                        nw: fifthUser.earnings.ab.nw,
                                                        ot: fifthUser.earnings.ab.ot + 1,
                                                        oa: fifthUser.earnings.ab.oa
                                                      },
                                                      te: fifthUser.earnings.te + 1,
                                                      ri: fifthUser.earnings.ri,
                                                      wb: fifthUser.earnings.wb,
                                                      nw: fifthUser.earnings.nw,
                                                      ot: fifthUser.earnings.ot + 1,
                                                      oa: fifthUser.earnings.oa
                                                    }}},  function(err){
                                                    if(err){
                                                      console.log(err);
                                                    }
                                                  });


                                                  if(fifthUser.transaction){
                                                    const transaction = fifthUser.transaction;
                                                    const newTran = {
                                                      type: 'network-2',
                                                      mode: 'credit',
                                                      amount: '1',
                                                      date: updated
                                                    };
                                                    transaction.push(newTran);
                                                    User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                      if(err){
                                                        console.log(err);
                                                      }
                                                    });
                                                  }else{
                                                    const newTran = {
                                                      type: 'network-2',
                                                      mode: 'credit',
                                                      amount: '1',
                                                      date: updated
                                                    };
                                                    User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                      if(err){
                                                        console.log(err);
                                                      }
                                                    });
                                                  }
                                                }

                                                //Sixth User
                                                User.findOne({sponID:fifthUser.sponsorID}, function(err, sixthUser){
                                                  if(err){
                                                    console.log(err);
                                                  }else{
                                                    if(sixthUser){
                                                      if(sixthUser.status === "Active+"){
                                                        User.updateOne({sponID: fifthUser.sponsorID},
                                                          {$set:{earnings:{
                                                            ab:{
                                                              ri: sixthUser.earnings.ab.ri,
                                                              wb: sixthUser.earnings.ab.wb,
                                                              nw: sixthUser.earnings.ab.nw,
                                                              ot: sixthUser.earnings.ab.ot + 1,
                                                              oa: sixthUser.earnings.ab.oa
                                                            },
                                                            te: sixthUser.earnings.te + 1,
                                                            ri: sixthUser.earnings.ri,
                                                            wb: sixthUser.earnings.wb,
                                                            nw: sixthUser.earnings.nw,
                                                            ot: sixthUser.earnings.ot + 1,
                                                            oa: sixthUser.earnings.oa
                                                          }}},  function(err){
                                                          if(err){
                                                            console.log(err);
                                                          }
                                                        });


                                                        if(sixthUser.transaction){
                                                          const transaction = sixthUser.transaction;
                                                          const newTran = {
                                                            type: 'network-3',
                                                            mode: 'credit',
                                                            amount: '1',
                                                            date: updated
                                                          };
                                                          transaction.push(newTran);
                                                          User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                            if(err){
                                                              console.log(err);
                                                            }
                                                          });
                                                        }else{
                                                          const newTran = {
                                                            type: 'network-3',
                                                            mode: 'credit',
                                                            amount: '1',
                                                            date: updated
                                                          };
                                                          User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                            if(err){
                                                              console.log(err);
                                                            }
                                                          });
                                                        }
                                                      }

                                                      //Seveth User
                                                      User.findOne({sponID:sixthUser.sponsorID}, function(err, seventhUser){
                                                        if(err){
                                                          console.log(err);
                                                        }else{
                                                          if(seventhUser){
                                                            if(seventhUser.status === "Active+"){
                                                              User.updateOne({sponID: sixthUser.sponsorID},
                                                                {$set:{earnings:{
                                                                  ab:{
                                                                    ri: seventhUser.earnings.ab.ri,
                                                                    wb: seventhUser.earnings.ab.wb,
                                                                    nw: seventhUser.earnings.ab.nw,
                                                                    ot: seventhUser.earnings.ab.ot + 1,
                                                                    oa: seventhUser.earnings.ab.oa
                                                                  },
                                                                  te: seventhUser.earnings.te + 1,
                                                                  ri: seventhUser.earnings.ri,
                                                                  wb: seventhUser.earnings.wb,
                                                                  nw: seventhUser.earnings.nw,
                                                                  ot: seventhUser.earnings.ot + 1,
                                                                  oa: seventhUser.earnings.oa
                                                                }}},  function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });


                                                              if(seventhUser.transaction){
                                                                const transaction = seventhUser.transaction;
                                                                const newTran = {
                                                                  type: 'network-4',
                                                                  mode: 'credit',
                                                                  amount: '1',
                                                                  date: updated
                                                                };
                                                                transaction.push(newTran);
                                                                User.updateOne({email: seventhUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                  if(err){
                                                                    console.log(err);
                                                                  }
                                                                });
                                                              }else{
                                                                const newTran = {
                                                                  type: 'network-4',
                                                                  mode: 'credit',
                                                                  amount: '1',
                                                                  date: updated
                                                                };
                                                                User.updateOne({email: seventhUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                  if(err){
                                                                    console.log(err);
                                                                  }
                                                                });
                                                              }
                                                            }

                                                            //Eighth User
                                                            User.findOne({sponID:seventhUser.sponsorID}, function(err, eighthUser){
                                                              if(err){
                                                                console.log(err);
                                                              }else{
                                                                if(eighthUser){
                                                                  if(eighthUser.status === "Active+"){
                                                                    User.updateOne({sponID: seventhUser.sponsorID},
                                                                      {$set:{earnings:{
                                                                        ab:{
                                                                          ri: eighthUser.earnings.ab.ri,
                                                                          wb: eighthUser.earnings.ab.wb,
                                                                          nw: eighthUser.earnings.ab.nw,
                                                                          ot: eighthUser.earnings.ab.ot + 1,
                                                                          oa: eighthUser.earnings.ab.oa
                                                                        },
                                                                        te: eighthUser.earnings.te + 1,
                                                                        ri: eighthUser.earnings.ri,
                                                                        wb: eighthUser.earnings.wb,
                                                                        nw: eighthUser.earnings.nw,
                                                                        ot: eighthUser.earnings.ot + 1,
                                                                        oa: eighthUser.earnings.oa
                                                                      }}},  function(err){
                                                                      if(err){
                                                                        console.log(err);
                                                                      }
                                                                    });


                                                                    if(eighthUser.transaction){
                                                                      const transaction = eighthUser.transaction;
                                                                      const newTran = {
                                                                        type: 'network-5',
                                                                        mode: 'credit',
                                                                        amount: '1',
                                                                        date: updated
                                                                      };
                                                                      transaction.push(newTran);
                                                                      User.updateOne({email: eighthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });
                                                                    }else{
                                                                      const newTran = {
                                                                        type: 'network-5',
                                                                        mode: 'credit',
                                                                        amount: '1',
                                                                        date: updated
                                                                      };
                                                                      User.updateOne({email: eighthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });
                                                                    }
                                                                  }

                                                                  //Nineth User
                                                                  User.findOne({sponID:eighthUser.sponsorID}, function(err, ninethUser){
                                                                    if(err){
                                                                      console.log(err);
                                                                    }else{
                                                                      if(ninethUser){
                                                                        if(ninethUser.status === "Active+"){
                                                                          User.updateOne({sponID: eighthUser.sponsorID},
                                                                            {$set:{earnings:{
                                                                              ab:{
                                                                                ri: ninethUser.earnings.ab.ri,
                                                                                wb: ninethUser.earnings.ab.wb,
                                                                                nw: ninethUser.earnings.ab.nw,
                                                                                ot: ninethUser.earnings.ab.ot + 1,
                                                                                oa: ninethUser.earnings.ab.oa
                                                                              },
                                                                              te: ninethUser.earnings.te + 1,
                                                                              ri: ninethUser.earnings.ri,
                                                                              wb: ninethUser.earnings.wb,
                                                                              nw: ninethUser.earnings.nw,
                                                                              ot: ninethUser.earnings.ot + 1,
                                                                              oa: ninethUser.earnings.oa
                                                                            }}},  function(err){
                                                                            if(err){
                                                                              console.log(err);
                                                                            }
                                                                          });


                                                                          if(ninethUser.transaction){
                                                                            const transaction = ninethUser.transaction;
                                                                            const newTran = {
                                                                              type: 'network-6',
                                                                              mode: 'credit',
                                                                              amount: '1',
                                                                              date: updated
                                                                            };
                                                                            transaction.push(newTran);
                                                                            User.updateOne({email: ninethUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                              if(err){
                                                                                console.log(err);
                                                                              }
                                                                            });
                                                                          }else{
                                                                            const newTran = {
                                                                              type: 'network-6',
                                                                              mode: 'credit',
                                                                              amount: '1',
                                                                              date: updated
                                                                            };
                                                                            User.updateOne({email: ninethUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                              if(err){
                                                                                console.log(err);
                                                                              }
                                                                            });
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  });
                                                                }
                                                              }
                                                            });
                                                          }
                                                        }
                                                      });
                                                    }
                                                  }
                                                });
                                              }
                                            }
                                          });
                                        }
                                      }
                                    });
                                  }
                                }
                              });
                            }
                          }
                        });
                      }
                    }
                  });
                }else{

                  const newOrder = new Order ({
                    email: body.data.metadata.email,
                    data: body.data,
                    checkout: body.data.checkout,
                    id: body.data.id,
                    type: body.type,
                    token: 'Valid'
                  });
                  newOrder.save();
                }
              }else{

                const newOrder = new Order ({
                  email: body.data.metadata.email,
                  data: body.data,
                  checkout: body.data.checkout,
                  id: body.data.id,
                  type: body.type,
                  token: 'Valid'
                });
                newOrder.save();
              }
            }
          }else{
            const newOrder = new Order ({
              email: body.data.metadata.email,
              data: body.data,
              checkout: body.data.checkout,
              id: body.data.id,
              type: body.type,
              token: 'Valid'
            });
            newOrder.save();
          }
        }
      });
    }else{

        User.findOne({email:email}, function(err, foundUser){
          if(err){
            console.log(err)
          }else{
            if(foundUser){
              const addAmount = parseInt(amount)
              User.updateOne({email:email}, {$set:{wallet: foundUser.wallet + addAmount}}, function(error){
                if(error){
                  console.log(error);
                }else{

                  if(foundUser.transaction){
                    const transaction = foundUser.transaction;
                    const newTran = {
                      type: 'wallet',
                      mode: 'credit',
                      amount: amount,
                      date: updated
                    };
                    transaction.push(newTran);
                    User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                  }else{
                    const newTran = {
                      type: 'wallet',
                      mode: 'credit',
                      amount: amount,
                      date: updated
                    };
                    User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                      if(err){
                        console.log(err);
                      }
                    });
                  }

                }
              })
            }
          }
        });
    }
    }

  }
  // if (event.type === 'charge:pending'){
  //
  //       Order.findOne({id:body.data.id}, function(err, foundPayment){
  //         if(err){
  //
  //         }else{
  //           if(!foundPayment){
  //             User.findOne({email:email}, function(err, foundUser){
  //               if(err){
  //                 console.log(err)
  //               }else{
  //                 if(foundUser){
  //                   const addAmount = parseInt(amount)
  //                   const newOrder = new Order ({
  //                     email: body.data.metadata.email,
  //                     data: body.data,
  //                     checkout: body.data.checkout,
  //                     id: body.data.id,
  //                     type: body.type,
  //                     token: 'Invalid'
  //                   });
  //                   newOrder.save();
  //
  //                   if(foundUser.transaction){
  //                     const transaction = foundUser.transaction;
  //                     const newTran = {
  //                       type: 'wallet',
  //                       mode: 'pending',
  //                       amount: parseInt(amount),
  //                       date: updated
  //                     };
  //                     transaction.push(newTran);
  //                     User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
  //                       if(err){
  //                         console.log(err);
  //                       }
  //                     });
  //                   }else{
  //                     const newTran = {
  //                       type: 'wallet',
  //                       mode: 'pending',
  //                       amount: parseInt(amount),
  //                       date: updated
  //                     };
  //                     User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
  //                       if(err){
  //                         console.log(err);
  //                       }
  //                     });
  //                   }
  //                 }
  //               }
  //             });
  //
  //           }
  //         }
  //       });
  // }
  // if (event.type === 'charge:failed'){
  //
  //       Order.findOne({id:body.data.id}, function(err, foundPayment){
  //         if(err){
  //
  //         }else{
  //           if(!foundPayment){
  //             User.findOne({email:email}, function(err, foundUser){
  //               if(err){
  //                 console.log(err)
  //               }else{
  //                 if(foundUser){
  //                   const addAmount = parseInt(amount)
  //                   const newOrder = new Order ({
  //                     email: body.data.metadata.email,
  //                     data: body.data,
  //                     checkout: body.data.checkout,
  //                     id: body.data.id,
  //                     type: body.type,
  //                     token: 'Invalid'
  //                   });
  //                   newOrder.save();
  //
  //                   if(foundUser.transaction){
  //                     const transaction = foundUser.transaction;
  //                     const newTran = {
  //                       type: 'wallet',
  //                       mode: 'debit',
  //                       amount: parseInt(amount),
  //                       date: updated
  //                     };
  //                     transaction.push(newTran);
  //                     User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
  //                       if(err){
  //                         console.log(err);
  //                       }
  //                     });
  //                   }else{
  //                     const newTran = {
  //                       type: 'wallet',
  //                       mode: 'debit',
  //                       amount: parseInt(amount),
  //                       date: updated
  //                     };
  //                     User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
  //                       if(err){
  //                         console.log(err);
  //                       }
  //                     });
  //                   }
  //                 }
  //               }
  //             });
  //
  //           }else{
  //             if(foundPayment.type == 'charge:pending'){
  //               User.findOne({email:email}, function(err, foundUser){
  //                 if(err){
  //                   console.log(err)
  //                 }else{
  //                   if(foundUser){
  //                     const addAmount = parseInt(amount)
  //                     User.updateOne({email:email}, {$set:{wallet: foundUser.wallet + addAmount}}, function(error){
  //                       if(error){
  //                         console.log(error);
  //                       }else{
  //                         Order.updateOne({id:foundPayment.data.id}, {$set:{type:'charge:confirmed'}}, function(error){
  //                           if(error){
  //                             console.log(error);
  //                           }
  //                         });
  //
  //                         if(foundUser.transaction){
  //                           const transaction = foundUser.transaction;
  //                           const newTran = {
  //                             type: 'wallet',
  //                             mode: 'credit',
  //                             amount: parseInt(amount),
  //                             date: updated
  //                           };
  //                           transaction.push(newTran);
  //                           User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
  //                             if(err){
  //                               console.log(err);
  //                             }
  //                           });
  //                         }else{
  //                           const newTran = {
  //                             type: 'wallet',
  //                             mode: 'credit',
  //                             amount: parseInt(amount),
  //                             date: updated
  //                           };
  //                           User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
  //                             if(err){
  //                               console.log(err);
  //                             }
  //                           });
  //                         }
  //
  //                       }
  //                     })
  //                   }
  //                 }
  //               });
  //
  //             }
  //           }
  //         }
  //       });
  // }

  res.send(`success ${event.id}`);

} catch (error) {
  if(error){
    console.log(error);
  }
  res.status(400).send('failure!');
}
});

app.post('/id-activation', function(req, res){
  if(!req.session.user){
    res.redirect('/login');
  }else{
    User.findOne({email:req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.findOne({sponID: req.body.sponID}, function(error, sponUser){
          if(error){
            console.log(error);
          }else{
            if(sponUser){
              res.render("id-activation", {user: foundUser,wallet:foundUser.wallet,sponsor: sponUser,status: foundUser.status });
            }else{
              res.render("id-activation", {user: foundUser,wallet:foundUser.wallet,status: foundUser.status });
            }
          }
        })
      }
    });
  }
});

app.post('/activation', function(req, res){
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;

  if(!req.session.user){
    res.redirect('/login');
  }else{
    User.findOne({email:req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.findOne({sponID: req.body.sponID}, function(error, sponsorUser){
          if(error){
            console.log(error);
          }else{
           if(sponsorUser){
             const email = sponsorUser.email;
               if(sponsorUser.status == 'Inactive'){
                 if(foundUser.wallet > 24){
                   //process it
                   //For Basic Plan
                   User.updateOne({email: email},{$set:{status: "Active"}}, function(err){
                     if(err){
                       console.log(err);
                     }else{
                       User.updateOne({email:foundUser.email}, {$set:{wallet:foundUser.wallet - 25}}, function(error){
                         if(error){
                           console.log(error);
                         }
                       });
                       if(foundUser.transaction){
                         const transaction = foundUser.transaction;
                         const newTran = {
                           type: 'basic',
                           mode: 'debit',
                           amount: '25',
                           date: updated
                         };
                         transaction.push(newTran);
                         User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                           if(err){
                             console.log(err);
                           }
                         });
                       }else{
                         const newTran = {
                           type: 'basic',
                           mode: 'debit',
                           amount: '25',
                           date: updated
                         };
                         User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                           if(err){
                             console.log(err);
                           }
                         });
                       }
                     }
                   });
                   User.updateOne({email: email},{$set:{time: updated }}, function(err){
                     if(err){
                       console.log(err);
                     }
                   });

                   // Referral points
                   User.findOne({sponID: sponsorUser.sponsorID}, function(err, sponUser){
                     if(err){
                       console.log(err);
                     }else{
                       if(sponUser){
                         if(sponUser.status == "Active"){
                           User.updateOne({sponID: sponsorUser.sponsorID},
                             {$set:{earnings:{
                               ab:{
                                 ri: sponUser.earnings.ab.ri + 10,
                                 wb: sponUser.earnings.ab.wb,
                                 nw: sponUser.earnings.ab.nw
                               },
                               te: sponUser.earnings.te + 10,
                               ri: sponUser.earnings.ri + 10,
                               wb: sponUser.earnings.wb,
                               nw: sponUser.earnings.nw
                             }}},  function(err){
                             if(err){
                               console.log(err);
                             }
                           });
                           if(sponUser.transaction){
                             const transaction = sponUser.transaction;
                             const newTran = {
                               type: 'referral',
                               mode: 'credit',
                               amount: '10',
                               date: updated
                             };
                             transaction.push(newTran);
                             User.updateOne({email: sponUser.email}, {$set:{transaction:transaction}}, function(err){
                               if(err){
                                 console.log(err);
                               }
                             });
                           }else{
                             const newTran = {
                               type: 'referral',
                               mode: 'credit',
                               amount: '10',
                               date: updated
                             };
                             User.updateOne({email: sponUser.email}, {$set:{transaction:newTran}}, function(err){
                               if(err){
                                 console.log(err);
                               }
                             });
                           }

                       }else{
                         if(sponUser.status == "Active+"){
                         User.updateOne({sponID: sponsorUser.sponsorID},
                           {$set:{earnings:{
                             ab:{
                               ri: sponUser.earnings.ab.ri + 10,
                               wb: sponUser.earnings.ab.wb,
                               nw: sponUser.earnings.ab.nw,
                               ot: sponUser.earnings.ab.ot,
                               oa: sponUser.earnings.ab.oa
                             },
                             te: sponUser.earnings.te + 10,
                             ri: sponUser.earnings.ri + 10,
                             wb: sponUser.earnings.wb,
                             nw: sponUser.earnings.nw,
                             ot: sponUser.earnings.ot,
                             oa: sponUser.earnings.oa
                           }}},  function(err){
                           if(err){
                             console.log(err);
                           }
                         });
                         if(sponUser.transaction){
                           const transaction = sponUser.transaction;
                           const newTran = {
                             type: 'referral',
                             mode: 'credit',
                             amount: '10',
                             date: updated
                           };
                           transaction.push(newTran);
                           User.updateOne({email: sponUser.email}, {$set:{transaction:transaction}}, function(err){
                             if(err){
                               console.log(err);
                             }
                           });
                         }else{
                           const newTran = {
                             type: 'referral',
                             mode: 'credit',
                             amount: '10',
                             date: updated
                           };
                           User.updateOne({email: sponUser.email}, {$set:{transaction:newTran}}, function(err){
                             if(err){
                               console.log(err);
                             }
                           });
                         }
                       }
                       }
                    // level points
                      User.findOne({sponID: sponUser.sponsorID}, function(err, firstUser){
                      if(err){
                        console.log(err);
                      } else {
                        if(firstUser){
                          if(firstUser.status === "Active+"){
                            User.updateOne({sponID: sponUser.sponsorID},
                              {$set:{earnings:{
                                ab:{
                                  ri: firstUser.earnings.ab.ri,
                                  wb: firstUser.earnings.ab.wb + 0.5,
                                  nw: firstUser.earnings.ab.nw,
                                  ot: firstUser.earnings.ab.ot,
                                  oa: firstUser.earnings.ab.oa
                                },
                                te: firstUser.earnings.te + 0.5,
                                ri: firstUser.earnings.ri,
                                wb: firstUser.earnings.wb + 0.5,
                                nw: firstUser.earnings.nw,
                                ot: firstUser.earnings.ot,
                                oa: firstUser.earnings.oa
                              }}},  function(err){
                              if(err){
                                console.log(err);
                              }
                            });

                            if(firstUser.transaction){
                              const transaction = firstUser.transaction;
                              const newTran = {
                                type: 'level-1',
                                mode: 'credit',
                                amount: '0.5',
                                date: updated
                              };
                              transaction.push(newTran);
                              User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }else{
                              const newTran = {
                                type: 'level-1',
                                mode: 'credit',
                                amount: '0.5',
                                date: updated
                              };
                              User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }

                          }


                            if(firstUser.status === "Active"){
                              User.updateOne({sponID: sponUser.sponsorID},
                                {$set:{earnings:{
                                  ab:{
                                    ri: firstUser.earnings.ab.ri,
                                    wb: firstUser.earnings.ab.wb + 0.5,
                                    nw: firstUser.earnings.ab.nw
                                  },
                                  te: firstUser.earnings.te + 0.5,
                                  ri: firstUser.earnings.ri,
                                  wb: firstUser.earnings.wb + 0.5,
                                  nw: firstUser.earnings.nw
                                }}},  function(err){
                                if(err){
                                  console.log(err);
                                }
                              });

                              if(firstUser.transaction){
                                const transaction = firstUser.transaction;
                                const newTran = {
                                  type: 'level-1',
                                  mode: 'credit',
                                  amount: '0.5',
                                  date: updated
                                };
                                transaction.push(newTran);
                                User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                  if(err){
                                    console.log(err);
                                  }
                                });
                              }else{
                                const newTran = {
                                  type: 'level-1',
                                  mode: 'credit',
                                  amount: '0.5',
                                  date: updated
                                };
                                User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                  if(err){
                                    console.log(err);
                                  }
                                });
                              }

                            }

                            User.findOne({sponID: firstUser.sponsorID}, function(err, secondUser){
                              if(err){
                                console.log(err);
                              }else{
                                if(secondUser){
                                  if(secondUser.status === "Active+"){
                                    User.updateOne({sponID: firstUser.sponsorID},
                                      {$set:{earnings:{
                                        ab:{
                                          ri: secondUser.earnings.ab.ri,
                                          wb: secondUser.earnings.ab.wb + 0.5,
                                          nw: secondUser.earnings.ab.nw,
                                          ot: secondUser.earnings.ab.ot,
                                          oa: secondUser.earnings.ab.oa
                                        },
                                        te: secondUser.earnings.te + 0.5,
                                        ri: secondUser.earnings.ri,
                                        wb: secondUser.earnings.wb + 0.5,
                                        nw: secondUser.earnings.nw,
                                        ot: secondUser.earnings.ot,
                                        oa: secondUser.earnings.oa
                                      }}},  function(err){
                                      if(err){
                                        console.log(err);
                                      }
                                    });

                                    if(secondUser.transaction){
                                      const transaction = secondUser.transaction;
                                      const newTran = {
                                        type: 'level-2',
                                        mode: 'credit',
                                        amount: '0.5',
                                        date: updated
                                      };
                                      transaction.push(newTran);
                                      User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });
                                    }else{
                                      const newTran = {
                                        type: 'level-2',
                                        mode: 'credit',
                                        amount: '0.5',
                                        date: updated
                                      };
                                      User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });
                                    }
                                  }

                                  if(secondUser.status === "Active"){
                                      User.updateOne({sponID: firstUser.sponsorID},
                                        {$set:{earnings:{
                                          ab:{
                                            ri: secondUser.earnings.ab.ri,
                                            wb: secondUser.earnings.ab.wb + 0.5,
                                            nw: secondUser.earnings.ab.nw
                                          },
                                          te: secondUser.earnings.te + 0.5,
                                          ri: secondUser.earnings.ri,
                                          wb: secondUser.earnings.wb + 0.5,
                                          nw: secondUser.earnings.nw
                                        }}},  function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });

                                      if(secondUser.transaction){
                                        const transaction = secondUser.transaction;
                                        const newTran = {
                                          type: 'level-2',
                                          mode: 'credit',
                                          amount: '0.5',
                                          date: updated
                                        };
                                        transaction.push(newTran);
                                        User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });
                                      }else{
                                        const newTran = {
                                          type: 'level-2',
                                          mode: 'credit',
                                          amount: '0.5',
                                          date: updated
                                        };
                                        User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });
                                      }
                                    }

                                    //Third User
                                    User.findOne({sponID:secondUser.sponsorID}, function(err, thirdUser){
                                      if(err){
                                        console.log(err);
                                      }else{
                                        if(thirdUser){
                                          if(thirdUser.status === "Active+"){
                                            User.updateOne({sponID: secondUser.sponsorID},
                                              {$set:{earnings:{
                                                ab:{
                                                  ri: thirdUser.earnings.ab.ri,
                                                  wb: thirdUser.earnings.ab.wb + 0.5,
                                                  nw: thirdUser.earnings.ab.nw,
                                                  ot: thirdUser.earnings.ab.ot,
                                                  oa: thirdUser.earnings.ab.oa
                                                },
                                                te: thirdUser.earnings.te + 0.5,
                                                ri: thirdUser.earnings.ri,
                                                wb: thirdUser.earnings.wb + 0.5,
                                                nw: thirdUser.earnings.nw,
                                                ot: thirdUser.earnings.ot,
                                                oa: thirdUser.earnings.oa
                                              }}},  function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });


                                            if(thirdUser.transaction){
                                              const transaction = thirdUser.transaction;
                                              const newTran = {
                                                type: 'level-3',
                                                mode: 'credit',
                                                amount: '0.5',
                                                date: updated
                                              };
                                              transaction.push(newTran);
                                              User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              const newTran = {
                                                type: 'level-3',
                                                mode: 'credit',
                                                amount: '0.5',
                                                date: updated
                                              };
                                              User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }
                                          }

                                          if(thirdUser.status === "Active"){
                                              User.updateOne({sponID: secondUser.sponsorID},
                                                {$set:{earnings:{
                                                  ab:{
                                                    ri: thirdUser.earnings.ab.ri,
                                                    wb: thirdUser.earnings.ab.wb + 0.5,
                                                    nw: thirdUser.earnings.ab.nw
                                                  },
                                                  te: thirdUser.earnings.te + 0.5,
                                                  ri: thirdUser.earnings.ri,
                                                  wb: thirdUser.earnings.wb + 0.5,
                                                  nw: thirdUser.earnings.nw
                                                }}},  function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });


                                              if(thirdUser.transaction){
                                                const transaction = thirdUser.transaction;
                                                const newTran = {
                                                  type: 'level-3',
                                                  mode: 'credit',
                                                  amount: '0.5',
                                                  date: updated
                                                };
                                                transaction.push(newTran);
                                                User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                  if(err){
                                                    console.log(err);
                                                  }
                                                });
                                              }else{
                                                const newTran = {
                                                  type: 'level-3',
                                                  mode: 'credit',
                                                  amount: '0.5',
                                                  date: updated
                                                };
                                                User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                  if(err){
                                                    console.log(err);
                                                  }
                                                });
                                              }
                                            }

                                            //Forth User
                                            User.findOne({sponID:thirdUser.sponsorID}, function(err, fourthUser){
                                              if(err){
                                                console.log(err);
                                              }else{
                                                if(fourthUser){
                                                  if(fourthUser.status === "Active+"){
                                                    User.updateOne({sponID: thirdUser.sponsorID},
                                                      {$set:{earnings:{
                                                        ab:{
                                                          ri: fourthUser.earnings.ab.ri,
                                                          wb: fourthUser.earnings.ab.wb + 0.5,
                                                          nw: fourthUser.earnings.ab.nw,
                                                          ot: fourthUser.earnings.ab.ot,
                                                          oa: fourthUser.earnings.ab.oa
                                                        },
                                                        te: fourthUser.earnings.te + 0.5,
                                                        ri: fourthUser.earnings.ri,
                                                        wb: fourthUser.earnings.wb + 0.5,
                                                        nw: fourthUser.earnings.nw,
                                                        ot: fourthUser.earnings.ot,
                                                        oa: fourthUser.earnings.oa
                                                      }}},  function(err){
                                                      if(err){
                                                        console.log(err);
                                                      }
                                                    });


                                                    if(fourthUser.transaction){
                                                      const transaction = fourthUser.transaction;
                                                      const newTran = {
                                                        type: 'level-4',
                                                        mode: 'credit',
                                                        amount: '0.5',
                                                        date: updated
                                                      };
                                                      transaction.push(newTran);
                                                      User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                        if(err){
                                                          console.log(err);
                                                        }
                                                      });
                                                    }else{
                                                      const newTran = {
                                                        type: 'level-4',
                                                        mode: 'credit',
                                                        amount: '0.5',
                                                        date: updated
                                                      };
                                                      User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                        if(err){
                                                          console.log(err);
                                                        }
                                                      });
                                                    }
                                                  }


                                                  if(fourthUser.status === "Active"){
                                                      User.updateOne({sponID: thirdUser.sponsorID},
                                                        {$set:{earnings:{
                                                          ab:{
                                                            ri: fourthUser.earnings.ab.ri,
                                                            wb: fourthUser.earnings.ab.wb + 0.5,
                                                            nw: fourthUser.earnings.ab.nw
                                                          },
                                                          te: fourthUser.earnings.te + 0.5,
                                                          ri: fourthUser.earnings.ri,
                                                          wb: fourthUser.earnings.wb + 0.5,
                                                          nw: fourthUser.earnings.nw
                                                        }}},  function(err){
                                                        if(err){
                                                          console.log(err);
                                                        }
                                                      });


                                                      if(fourthUser.transaction){
                                                        const transaction = fourthUser.transaction;
                                                        const newTran = {
                                                          type: 'level-4',
                                                          mode: 'credit',
                                                          amount: '0.5',
                                                          date: updated
                                                        };
                                                        transaction.push(newTran);
                                                        User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                          if(err){
                                                            console.log(err);
                                                          }
                                                        });
                                                      }else{
                                                        const newTran = {
                                                          type: 'level-4',
                                                          mode: 'credit',
                                                          amount: '0.5',
                                                          date: updated
                                                        };
                                                        User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                          if(err){
                                                            console.log(err);
                                                          }
                                                        });
                                                      }
                                                    }

                                                    //fifth User
                                                    User.findOne({sponID:fourthUser.sponsorID}, function(err, fifthUser){
                                                      if(err){
                                                        console.log(err);
                                                      }else{
                                                        if(fifthUser){
                                                          if(fifthUser.status === "Active+"){
                                                            User.updateOne({sponID: fourthUser.sponsorID},
                                                              {$set:{earnings:{
                                                                ab:{
                                                                  ri: fifthUser.earnings.ab.ri,
                                                                  wb: fifthUser.earnings.ab.wb + 0.5,
                                                                  nw: fifthUser.earnings.ab.nw,
                                                                  ot: fifthUser.earnings.ab.ot,
                                                                  oa: fifthUser.earnings.ab.oa
                                                                },
                                                                te: fifthUser.earnings.te + 0.5,
                                                                ri: fifthUser.earnings.ri,
                                                                wb: fifthUser.earnings.wb + 0.5,
                                                                nw: fifthUser.earnings.nw,
                                                                ot: fifthUser.earnings.ot,
                                                                oa: fifthUser.earnings.oa
                                                              }}},  function(err){
                                                              if(err){
                                                                console.log(err);
                                                              }
                                                            });


                                                            if(fifthUser.transaction){
                                                              const transaction = fifthUser.transaction;
                                                              const newTran = {
                                                                type: 'level-5',
                                                                mode: 'credit',
                                                                amount: '0.5',
                                                                date: updated
                                                              };
                                                              transaction.push(newTran);
                                                              User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });
                                                            }else{
                                                              const newTran = {
                                                                type: 'level-5',
                                                                mode: 'credit',
                                                                amount: '0.5',
                                                                date: updated
                                                              };
                                                              User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });
                                                            }
                                                          }


                                                          if(fifthUser.status === "Active"){
                                                              User.updateOne({sponID: fourthUser.sponsorID},
                                                                {$set:{earnings:{
                                                                  ab:{
                                                                    ri: fifthUser.earnings.ab.ri,
                                                                    wb: fifthUser.earnings.ab.wb + 0.5,
                                                                    nw: fifthUser.earnings.ab.nw
                                                                  },
                                                                  te: fifthUser.earnings.te + 0.5,
                                                                  ri: fifthUser.earnings.ri,
                                                                  wb: fifthUser.earnings.wb + 0.5,
                                                                  nw: fifthUser.earnings.nw
                                                                }}},  function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });


                                                              if(fifthUser.transaction){
                                                                const transaction = fifthUser.transaction;
                                                                const newTran = {
                                                                  type: 'level-5',
                                                                  mode: 'credit',
                                                                  amount: '0.5',
                                                                  date: updated
                                                                };
                                                                transaction.push(newTran);
                                                                User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                  if(err){
                                                                    console.log(err);
                                                                  }
                                                                });
                                                              }else{
                                                                const newTran = {
                                                                  type: 'level-5',
                                                                  mode: 'credit',
                                                                  amount: '0.5',
                                                                  date: updated
                                                                };
                                                                User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                  if(err){
                                                                    console.log(err);
                                                                  }
                                                                });
                                                              }
                                                            }

                                                            //sixth User
                                                            User.findOne({sponID:fifthUser.sponsorID}, function(err, sixthUser){
                                                              if(err){
                                                                console.log(err);
                                                              }else{
                                                                if(sixthUser){
                                                                  if(sixthUser.status === "Active+"){
                                                                    User.updateOne({sponID: fifthUser.sponsorID},
                                                                      {$set:{earnings:{
                                                                        ab:{
                                                                          ri: sixthUser.earnings.ab.ri,
                                                                          wb: sixthUser.earnings.ab.wb + 0.5,
                                                                          nw: sixthUser.earnings.ab.nw,
                                                                          ot: sixthUser.earnings.ab.ot,
                                                                          oa: sixthUser.earnings.ab.oa
                                                                        },
                                                                        te: sixthUser.earnings.te + 0.5,
                                                                        ri: sixthUser.earnings.ri,
                                                                        wb: sixthUser.earnings.wb + 0.5,
                                                                        nw: sixthUser.earnings.nw,
                                                                        ot: sixthUser.earnings.ot,
                                                                        oa: sixthUser.earnings.oa
                                                                      }}},  function(err){
                                                                      if(err){
                                                                        console.log(err);
                                                                      }
                                                                    });


                                                                    if(sixthUser.transaction){
                                                                      const transaction = sixthUser.transaction;
                                                                      const newTran = {
                                                                        type: 'level-6',
                                                                        mode: 'credit',
                                                                        amount: '0.5',
                                                                        date: updated
                                                                      };
                                                                      transaction.push(newTran);
                                                                      User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });
                                                                    }else{
                                                                      const newTran = {
                                                                        type: 'level-6',
                                                                        mode: 'credit',
                                                                        amount: '0.5',
                                                                        date: updated
                                                                      };
                                                                      User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });
                                                                    }
                                                                  }


                                                                  if(sixthUser.status === "Active"){
                                                                      User.updateOne({sponID: fifthUser.sponsorID},
                                                                        {$set:{earnings:{
                                                                          ab:{
                                                                            ri: sixthUser.earnings.ab.ri,
                                                                            wb: sixthUser.earnings.ab.wb + 0.5,
                                                                            nw: sixthUser.earnings.ab.nw
                                                                          },
                                                                          te: sixthUser.earnings.te + 0.5,
                                                                          ri: sixthUser.earnings.ri,
                                                                          wb: sixthUser.earnings.wb + 0.5,
                                                                          nw: sixthUser.earnings.nw
                                                                        }}},  function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });


                                                                      if(sixthUser.transaction){
                                                                        const transaction = sixthUser.transaction;
                                                                        const newTran = {
                                                                          type: 'level-6',
                                                                          mode: 'credit',
                                                                          amount: '0.5',
                                                                          date: updated
                                                                        };
                                                                        transaction.push(newTran);
                                                                        User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                          if(err){
                                                                            console.log(err);
                                                                          }
                                                                        });
                                                                      }else{
                                                                        const newTran = {
                                                                          type: 'level-6',
                                                                          mode: 'credit',
                                                                          amount: '0.5',
                                                                          date: updated
                                                                        };
                                                                        User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                          if(err){
                                                                            console.log(err);
                                                                          }
                                                                        });
                                                                      }
                                                                    }
                                                                }
                                                              }
                                                            });
                                                        }
                                                      }
                                                    });
                                                }
                                              }
                                            });
                                        }
                                      }
                                    });
                                }
                              }
                            });
                        }
                      }
                    });
                       }
                     }
                   });
                   res.redirect('/dashboard');
                 }else{
                   //low balance
                   const alert = 'Low balance'
                   const alertType = 'warning'
                     res.render("id-activation", {user: foundUser,alert:{alert,alertType},wallet:foundUser.wallet,sponsor: sponsorUser,status: foundUser.status });
                 }
               }else{
                 // redirect back to activation page
                 res.redirect('/payment-portal');
               }
           }else{
             //redirect back to payment portal
             res.redirect('/payment-portal');
           }
          }
        })
      }
    });
  }
});

app.post('/upgradation', function(req, res){
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;

  if(!req.session.user){
    res.redirect('/login');
  }else{
    User.findOne({email:req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.findOne({sponID: req.body.sponID}, function(error, sponsorUser){
          if(error){
            console.log(error);
          }else{
           if(sponsorUser){
             const email = sponsorUser.email;
               if(sponsorUser.status == 'Active'){
                 if(foundUser.wallet > 49){
                   //process it
                   User.updateOne({email: sponsorUser.email},{$set:{status: "Active+"}}, function(err){
                     if(err){
                       console.log(err);
                     }else{
                       User.updateOne({email:foundUser.email}, {$set:{wallet:foundUser.wallet - 50}}, function(error){
                         if(error){
                           console.log(error);
                         }
                       });

                       if(foundUser.transaction){
                         const transaction = foundUser.transaction;
                         const newTran = {
                           type: 'upgrade',
                           mode: 'debit',
                           amount: '50',
                           date: updated
                         };
                         transaction.push(newTran);
                         User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                           if(err){
                             console.log(err);
                           }
                         });
                       }else{
                         const newTran = {
                           type: 'upgrade',
                           mode: 'debit',
                           amount: '50',
                           date: updated
                         };
                         User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                           if(err){
                             console.log(err);
                           }
                         });
                       }
                     }
                   });
                   User.updateOne({email: sponsorUser.email},{$set:{wallet: 0}}, function(err){
                     if(err){
                       console.log(err);
                     }
                   });
                   User.updateOne({email: sponsorUser.email},{$set:{earnings:{
                     ab:{
                       ri: sponsorUser.earnings.ab.ri,
                       wb: sponsorUser.earnings.ab.wb,
                       nw: sponsorUser.earnings.ab.nw,
                       ot: 0,
                       oa: 0
                     },
                     te: sponsorUser.earnings.te,
                     ri: sponsorUser.earnings.ri,
                     wb: sponsorUser.earnings.wb,
                     nw: sponsorUser.earnings.nw,
                     ot: 0,
                     oa: 0
                   }}}, function(err){
                     if(err){
                       console.log(err);
                     }
                   });

                   //  Referral points
                   User.findOne({sponID: sponsorUser.sponsorID}, function(err, firstUser){
                     if(err){
                       console.log(err);
                     } else {
                       if(firstUser){
                         if(firstUser.status === "Active+"){
                           User.updateOne({sponID: sponsorUser.sponsorID},
                             {$set:{earnings:{
                               ab:{
                                 ri: firstUser.earnings.ab.ri,
                                 wb: firstUser.earnings.ab.wb,
                                 nw: firstUser.earnings.ab.nw,
                                 ot: firstUser.earnings.ab.ot + 10,
                                 oa: firstUser.earnings.ab.oa
                               },
                               te: firstUser.earnings.te + 10,
                               ri: firstUser.earnings.ri,
                               wb: firstUser.earnings.wb,
                               nw: firstUser.earnings.nw,
                               ot: firstUser.earnings.ot + 10,
                               oa: firstUser.earnings.oa
                             }}},  function(err){
                             if(err){
                               console.log(err);
                             }
                           });

                           if(firstUser.transaction){
                             const transaction = firstUser.transaction;
                             const newTran = {
                               type: 'trial-1',
                               mode: 'credit',
                               amount: '10',
                               date: updated
                             };
                             transaction.push(newTran);
                             User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                               if(err){
                                 console.log(err);
                               }
                             });
                           }else{
                             const newTran = {
                               type: 'trial-1',
                               mode: 'credit',
                               amount: '10',
                               date: updated
                             };
                             User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                               if(err){
                                 console.log(err);
                               }
                             });
                           }

                         }


                         User.findOne({sponID: firstUser.sponsorID}, function(err, secondUser){
                           if(err){
                             console.log(err);
                           }else{
                             if(secondUser){
                               if(secondUser.status === "Active+"){
                                 User.updateOne({sponID: firstUser.sponsorID},
                                   {$set:{earnings:{
                                     ab:{
                                       ri: secondUser.earnings.ab.ri,
                                       wb: secondUser.earnings.ab.wb,
                                       nw: secondUser.earnings.ab.nw,
                                       ot: secondUser.earnings.ab.ot + 10,
                                       oa: secondUser.earnings.ab.oa
                                     },
                                     te: secondUser.earnings.te + 10,
                                     ri: secondUser.earnings.ri,
                                     wb: secondUser.earnings.wb,
                                     nw: secondUser.earnings.nw,
                                     ot: secondUser.earnings.ot + 10,
                                     oa: secondUser.earnings.oa
                                   }}},  function(err){
                                   if(err){
                                     console.log(err);
                                   }
                                 });

                                 if(secondUser.transaction){
                                   const transaction = secondUser.transaction;
                                   const newTran = {
                                     type: 'trial-2',
                                     mode: 'credit',
                                     amount: '10',
                                     date: updated
                                   };
                                   transaction.push(newTran);
                                   User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                 }else{
                                   const newTran = {
                                     type: 'trial-2',
                                     mode: 'credit',
                                     amount: '10',
                                     date: updated
                                   };
                                   User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                 }
                               }

                               //Third User
                               User.findOne({sponID:secondUser.sponsorID}, function(err, thirdUser){
                                 if(err){
                                   console.log(err);
                                 }else{
                                   if(thirdUser){
                                     if(thirdUser.status === "Active+"){
                                       User.updateOne({sponID: secondUser.sponsorID},
                                         {$set:{earnings:{
                                           ab:{
                                             ri: thirdUser.earnings.ab.ri,
                                             wb: thirdUser.earnings.ab.wb,
                                             nw: thirdUser.earnings.ab.nw,
                                             ot: thirdUser.earnings.ab.ot + 10,
                                             oa: thirdUser.earnings.ab.oa
                                           },
                                           te: thirdUser.earnings.te + 10,
                                           ri: thirdUser.earnings.ri,
                                           wb: thirdUser.earnings.wb,
                                           nw: thirdUser.earnings.nw,
                                           ot: thirdUser.earnings.ot + 10,
                                           oa: thirdUser.earnings.oa
                                         }}},  function(err){
                                         if(err){
                                           console.log(err);
                                         }
                                       });


                                       if(thirdUser.transaction){
                                         const transaction = thirdUser.transaction;
                                         const newTran = {
                                           type: 'trial-3',
                                           mode: 'credit',
                                           amount: '10',
                                           date: updated
                                         };
                                         transaction.push(newTran);
                                         User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                           if(err){
                                             console.log(err);
                                           }
                                         });
                                       }else{
                                         const newTran = {
                                           type: 'trial-3',
                                           mode: 'credit',
                                           amount: '10',
                                           date: updated
                                         };
                                         User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                           if(err){
                                             console.log(err);
                                           }
                                         });
                                       }
                                     }

                                     //Fourth User
                                     User.findOne({sponID:thirdUser.sponsorID}, function(err, fourthUser){
                                       if(err){
                                         console.log(err);
                                       }else{
                                         if(fourthUser){
                                           if(fourthUser.status === "Active+"){
                                             User.updateOne({sponID: thirdUser.sponsorID},
                                               {$set:{earnings:{
                                                 ab:{
                                                   ri: fourthUser.earnings.ab.ri,
                                                   wb: fourthUser.earnings.ab.wb,
                                                   nw: fourthUser.earnings.ab.nw,
                                                   ot: fourthUser.earnings.ab.ot + 1,
                                                   oa: fourthUser.earnings.ab.oa
                                                 },
                                                 te: fourthUser.earnings.te + 1,
                                                 ri: fourthUser.earnings.ri,
                                                 wb: fourthUser.earnings.wb,
                                                 nw: fourthUser.earnings.nw,
                                                 ot: fourthUser.earnings.ot + 1,
                                                 oa: fourthUser.earnings.oa
                                               }}},  function(err){
                                               if(err){
                                                 console.log(err);
                                               }
                                             });


                                             if(fourthUser.transaction){
                                               const transaction = fourthUser.transaction;
                                               const newTran = {
                                                 type: 'network-1',
                                                 mode: 'credit',
                                                 amount: '1',
                                                 date: updated
                                               };
                                               transaction.push(newTran);
                                               User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                 if(err){
                                                   console.log(err);
                                                 }
                                               });
                                             }else{
                                               const newTran = {
                                                 type: 'network-1',
                                                 mode: 'credit',
                                                 amount: '1',
                                                 date: updated
                                               };
                                               User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                 if(err){
                                                   console.log(err);
                                                 }
                                               });
                                             }
                                           }


                                           //Fifth User
                                           User.findOne({sponID:fourthUser.sponsorID}, function(err, fifthUser){
                                             if(err){
                                               console.log(err);
                                             }else{
                                               if(fifthUser){
                                                 if(fifthUser.status === "Active+"){
                                                   User.updateOne({sponID: fourthUser.sponsorID},
                                                     {$set:{earnings:{
                                                       ab:{
                                                         ri: fifthUser.earnings.ab.ri,
                                                         wb: fifthUser.earnings.ab.wb,
                                                         nw: fifthUser.earnings.ab.nw,
                                                         ot: fifthUser.earnings.ab.ot + 1,
                                                         oa: fifthUser.earnings.ab.oa
                                                       },
                                                       te: fifthUser.earnings.te + 1,
                                                       ri: fifthUser.earnings.ri,
                                                       wb: fifthUser.earnings.wb,
                                                       nw: fifthUser.earnings.nw,
                                                       ot: fifthUser.earnings.ot + 1,
                                                       oa: fifthUser.earnings.oa
                                                     }}},  function(err){
                                                     if(err){
                                                       console.log(err);
                                                     }
                                                   });


                                                   if(fifthUser.transaction){
                                                     const transaction = fifthUser.transaction;
                                                     const newTran = {
                                                       type: 'network-2',
                                                       mode: 'credit',
                                                       amount: '1',
                                                       date: updated
                                                     };
                                                     transaction.push(newTran);
                                                     User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                       if(err){
                                                         console.log(err);
                                                       }
                                                     });
                                                   }else{
                                                     const newTran = {
                                                       type: 'network-2',
                                                       mode: 'credit',
                                                       amount: '1',
                                                       date: updated
                                                     };
                                                     User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                       if(err){
                                                         console.log(err);
                                                       }
                                                     });
                                                   }
                                                 }

                                                 //Sixth User
                                                 User.findOne({sponID:fifthUser.sponsorID}, function(err, sixthUser){
                                                   if(err){
                                                     console.log(err);
                                                   }else{
                                                     if(sixthUser){
                                                       if(sixthUser.status === "Active+"){
                                                         User.updateOne({sponID: fifthUser.sponsorID},
                                                           {$set:{earnings:{
                                                             ab:{
                                                               ri: sixthUser.earnings.ab.ri,
                                                               wb: sixthUser.earnings.ab.wb,
                                                               nw: sixthUser.earnings.ab.nw,
                                                               ot: sixthUser.earnings.ab.ot + 1,
                                                               oa: sixthUser.earnings.ab.oa
                                                             },
                                                             te: sixthUser.earnings.te + 1,
                                                             ri: sixthUser.earnings.ri,
                                                             wb: sixthUser.earnings.wb,
                                                             nw: sixthUser.earnings.nw,
                                                             ot: sixthUser.earnings.ot + 1,
                                                             oa: sixthUser.earnings.oa
                                                           }}},  function(err){
                                                           if(err){
                                                             console.log(err);
                                                           }
                                                         });


                                                         if(sixthUser.transaction){
                                                           const transaction = sixthUser.transaction;
                                                           const newTran = {
                                                             type: 'network-3',
                                                             mode: 'credit',
                                                             amount: '1',
                                                             date: updated
                                                           };
                                                           transaction.push(newTran);
                                                           User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                             if(err){
                                                               console.log(err);
                                                             }
                                                           });
                                                         }else{
                                                           const newTran = {
                                                             type: 'network-3',
                                                             mode: 'credit',
                                                             amount: '1',
                                                             date: updated
                                                           };
                                                           User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                             if(err){
                                                               console.log(err);
                                                             }
                                                           });
                                                         }
                                                       }

                                                       //Seveth User
                                                       User.findOne({sponID:sixthUser.sponsorID}, function(err, seventhUser){
                                                         if(err){
                                                           console.log(err);
                                                         }else{
                                                           if(seventhUser){
                                                             if(seventhUser.status === "Active+"){
                                                               User.updateOne({sponID: sixthUser.sponsorID},
                                                                 {$set:{earnings:{
                                                                   ab:{
                                                                     ri: seventhUser.earnings.ab.ri,
                                                                     wb: seventhUser.earnings.ab.wb,
                                                                     nw: seventhUser.earnings.ab.nw,
                                                                     ot: seventhUser.earnings.ab.ot + 1,
                                                                     oa: seventhUser.earnings.ab.oa
                                                                   },
                                                                   te: seventhUser.earnings.te + 1,
                                                                   ri: seventhUser.earnings.ri,
                                                                   wb: seventhUser.earnings.wb,
                                                                   nw: seventhUser.earnings.nw,
                                                                   ot: seventhUser.earnings.ot + 1,
                                                                   oa: seventhUser.earnings.oa
                                                                 }}},  function(err){
                                                                 if(err){
                                                                   console.log(err);
                                                                 }
                                                               });


                                                               if(seventhUser.transaction){
                                                                 const transaction = seventhUser.transaction;
                                                                 const newTran = {
                                                                   type: 'network-4',
                                                                   mode: 'credit',
                                                                   amount: '1',
                                                                   date: updated
                                                                 };
                                                                 transaction.push(newTran);
                                                                 User.updateOne({email: seventhUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                   if(err){
                                                                     console.log(err);
                                                                   }
                                                                 });
                                                               }else{
                                                                 const newTran = {
                                                                   type: 'network-4',
                                                                   mode: 'credit',
                                                                   amount: '1',
                                                                   date: updated
                                                                 };
                                                                 User.updateOne({email: seventhUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                   if(err){
                                                                     console.log(err);
                                                                   }
                                                                 });
                                                               }
                                                             }

                                                             //Eighth User
                                                             User.findOne({sponID:seventhUser.sponsorID}, function(err, eighthUser){
                                                               if(err){
                                                                 console.log(err);
                                                               }else{
                                                                 if(eighthUser){
                                                                   if(eighthUser.status === "Active+"){
                                                                     User.updateOne({sponID: seventhUser.sponsorID},
                                                                       {$set:{earnings:{
                                                                         ab:{
                                                                           ri: eighthUser.earnings.ab.ri,
                                                                           wb: eighthUser.earnings.ab.wb,
                                                                           nw: eighthUser.earnings.ab.nw,
                                                                           ot: eighthUser.earnings.ab.ot + 1,
                                                                           oa: eighthUser.earnings.ab.oa
                                                                         },
                                                                         te: eighthUser.earnings.te + 1,
                                                                         ri: eighthUser.earnings.ri,
                                                                         wb: eighthUser.earnings.wb,
                                                                         nw: eighthUser.earnings.nw,
                                                                         ot: eighthUser.earnings.ot + 1,
                                                                         oa: eighthUser.earnings.oa
                                                                       }}},  function(err){
                                                                       if(err){
                                                                         console.log(err);
                                                                       }
                                                                     });


                                                                     if(eighthUser.transaction){
                                                                       const transaction = eighthUser.transaction;
                                                                       const newTran = {
                                                                         type: 'network-5',
                                                                         mode: 'credit',
                                                                         amount: '1',
                                                                         date: updated
                                                                       };
                                                                       transaction.push(newTran);
                                                                       User.updateOne({email: eighthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                         if(err){
                                                                           console.log(err);
                                                                         }
                                                                       });
                                                                     }else{
                                                                       const newTran = {
                                                                         type: 'network-5',
                                                                         mode: 'credit',
                                                                         amount: '1',
                                                                         date: updated
                                                                       };
                                                                       User.updateOne({email: eighthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                         if(err){
                                                                           console.log(err);
                                                                         }
                                                                       });
                                                                     }
                                                                   }

                                                                   //Nineth User
                                                                   User.findOne({sponID:eighthUser.sponsorID}, function(err, ninethUser){
                                                                     if(err){
                                                                       console.log(err);
                                                                     }else{
                                                                       if(ninethUser){
                                                                         if(ninethUser.status === "Active+"){
                                                                           User.updateOne({sponID: eighthUser.sponsorID},
                                                                             {$set:{earnings:{
                                                                               ab:{
                                                                                 ri: ninethUser.earnings.ab.ri,
                                                                                 wb: ninethUser.earnings.ab.wb,
                                                                                 nw: ninethUser.earnings.ab.nw,
                                                                                 ot: ninethUser.earnings.ab.ot + 1,
                                                                                 oa: ninethUser.earnings.ab.oa
                                                                               },
                                                                               te: ninethUser.earnings.te + 1,
                                                                               ri: ninethUser.earnings.ri,
                                                                               wb: ninethUser.earnings.wb,
                                                                               nw: ninethUser.earnings.nw,
                                                                               ot: ninethUser.earnings.ot + 1,
                                                                               oa: ninethUser.earnings.oa
                                                                             }}},  function(err){
                                                                             if(err){
                                                                               console.log(err);
                                                                             }
                                                                           });


                                                                           if(ninethUser.transaction){
                                                                             const transaction = ninethUser.transaction;
                                                                             const newTran = {
                                                                               type: 'network-6',
                                                                               mode: 'credit',
                                                                               amount: '1',
                                                                               date: updated
                                                                             };
                                                                             transaction.push(newTran);
                                                                             User.updateOne({email: ninethUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                               if(err){
                                                                                 console.log(err);
                                                                               }
                                                                             });
                                                                           }else{
                                                                             const newTran = {
                                                                               type: 'network-6',
                                                                               mode: 'credit',
                                                                               amount: '1',
                                                                               date: updated
                                                                             };
                                                                             User.updateOne({email: ninethUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                               if(err){
                                                                                 console.log(err);
                                                                               }
                                                                             });
                                                                           }
                                                                         }
                                                                       }
                                                                     }
                                                                   });
                                                                 }
                                                               }
                                                             });
                                                           }
                                                         }
                                                       });
                                                     }
                                                   }
                                                 });
                                               }
                                             }
                                           });
                                         }
                                       }
                                     });
                                   }
                                 }
                               });
                             }
                           }
                         });
                       }
                     }
                   });

                   res.redirect('/dashboard');
                 }else{
                   //low balance
                   const alert = 'Low balance'
                   const alertType = 'warning'
                     res.render("id-activation", {user: foundUser,alert:{alert,alertType},wallet:foundUser.wallet,sponsor: sponsorUser,status: foundUser.status });
                 }
               }else{
                 // redirect back to activation page
                 res.redirect('/payment-portal');
               }
           }else{
             //redirect back to payment portal
             res.redirect('/payment-portal');
           }
          }
        })
      }
    });
  }
});

app.post('/swap', function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      let d = new Date();
      let year = d.getFullYear();
      let month = d.getMonth() + 1;
      let date = d.getDate();
      let hour = d.getHours() ;
      let minutes = d.getMinutes();
      const currentTime = hour + ":" + minutes;
      const currentDate =  date + "/" + month + "/" + year;
      const usrID = foundUser.userID;
      const ri = foundUser.earnings.ab.ri;
      const wb = foundUser.earnings.ab.wb;
      const nw = foundUser.earnings.ab.nw;
      const rii = foundUser.earnings.ri;
      const amount = Number(req.body.amount);
      const type = req.body.type;

        if(type == 'referral'){
          if(amount<0){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum Swap "
              const alertType = "warning"

              if(foundUser.status == 'Active+'){
                if(foundUser.bankDetails){
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }else{
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }
              }else{
                if(foundUser.bankDetails){
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                }else{
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                }
              }
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const rii = foundUser.earnings.ri;
                if(ri< req.body.amount){
                    const alert = "Low Balance, please try again."
                    const alertType = "warning"

                    if(foundUser.status == 'Active+'){
                      if(foundUser.bankDetails){
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }else{
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }
                    }else{
                      if(foundUser.bankDetails){
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                      }else{
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                      }
                    }
                  }else{

                    User.findOne({email: req.session.user.email}, function(err, user){
                      const newValue = user.earnings.ab.ri - req.body.amount;

                      if(user.status == "Active"){
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }else{
                            User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }
                        });
                      }else{
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot: user.earnings.ab.ot,oa: user.earnings.ab.oa, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri,oa: user.earnings.oa,ot: user.earnings.ot, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }else{
                            User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }
                        });
                      }


                      const alert = "Swap success"
                      const alertType = "success"
                      if(foundUser.status == 'Active+'){
                        if(foundUser.bankDetails){
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }else{
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }
                      }else{
                        if(foundUser.bankDetails){
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                        }else{
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                        }
                      }
                    });
                }

            });
          }
        }
        if(type == 'autobot'){
          if(nw< amount){
            const alert = "Low Balance, please try again."
            const alertType = "danger"


              if(foundUser.status == 'Active+'){
                if(foundUser.bankDetails){
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }else{
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }
              }else{
                if(foundUser.bankDetails){
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                }else{
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                }
              }
              }else{

              if(rii === 0){
                const alert = "One direct referral is required"
                const alertType = "danger"
                  if(foundUser.status == 'Active+'){
                    if(foundUser.bankDetails){
                        res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }else{
                        res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }
                  }else{
                    if(foundUser.bankDetails){
                        res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                    }else{
                        res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                    }
                  }
                }
              else{
                if(req.body.amount < 0){
                  const alert = "Amount is less than minimum swap "
                  const alertType = "warning"


                    if(foundUser.status == 'Active+'){
                      if(foundUser.bankDetails){
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }else{
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }
                    }else{
                      if(foundUser.bankDetails){
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                      }else{
                          res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                      }
                    }
                  }else{

                    User.findOne({email: req.session.user.email}, function(err, user){
                      const newValue = user.earnings.ab.nw - req.body.amount;

                        if(user.status == "Active"){
                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                            if(err){
                              console.log(err);
                            }else{
                              User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }
                          });
                        }else{
                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                            if(err){
                              console.log(err);
                            }else{
                              User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                                if(err){
                                  console.log(err);
                                }
                              });
                            }
                          });
                        }


                        const alert = "Swap success"
                        const alertType = "success"

                        if(foundUser.status == 'Active+'){
                          if(foundUser.bankDetails){
                              res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                          }else{
                              res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                          }
                        }else{
                          if(foundUser.bankDetails){
                              res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                          }else{
                              res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                          }
                        }
                      });
                  }
                }
          }
        }
        if(type == 'superUser'){
          if(amount<0){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum swap "
              const alertType = "warning"

              if(foundUser.status == 'Active+'){
                if(foundUser.bankDetails){
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }else{
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }
              }else{
                if(foundUser.bankDetails){
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                }else{
                    res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                }
              }
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;

              if(wb< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                if(foundUser.status == 'Active+'){
                  if(foundUser.bankDetails){
                      res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }else{
                      res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }
                }else{
                  if(foundUser.bankDetails){
                      res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                  }else{
                      res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                  }
                }
              }else{

                User.findOne({email: req.session.user.email}, function(err, user){
                  const newValue = user.earnings.ab.wb - req.body.amount;

                      if(user.status == "Active"){
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }else{
                            User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }
                        });
                      }else{
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri,ot:user.earnings.ot,oa:user.earnings.oa, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }else{
                            User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                          }
                        });
                      }

                      const alert = "Swap success"
                      const alertType = "success"

                      if(foundUser.status == 'Active+'){
                        if(foundUser.bankDetails){
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }else{
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }
                      }else{
                        if(foundUser.bankDetails){
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                        }else{
                            res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,alert:{alert, alertType}, ri, wb, nw});
                        }
                      }
                    });
              }
            });
          }
        }
        if(type == 'trial'){
          if(amount<0){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum swap "
              const alertType = "warning"

              res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const ot = foundUser.earnings.ab.ot;
              const oa = foundUser.earnings.ab.oa;

              if(ot< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
             }else{

               User.findOne({email: req.session.user.email}, function(err, user){
                 const newValue = user.earnings.ab.ot - req.body.amount;

                 User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:newValue,oa:user.earnings.ab.oa}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                   if(err){
                     console.log(err);
                   }else{
                     User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                       if(err){
                         console.log(err);
                       }
                     });
                   }
                 });

                 const alert = "Swap success"
                 const alertType = "success"

                 res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});

               });
              }
            });
          }

        }
        if(type == 'arc'){
          if(amount<0){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum swap "
              const alertType = "warning"

              res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
          });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const ot = foundUser.earnings.ab.ot;
              const oa = foundUser.earnings.ab.oa;

              if(oa< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
            }else{

                User.findOne({email: req.session.user.email}, function(err, user){
                  const newValue = user.earnings.ab.oa - req.body.amount;

                  User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:user.earnings.ab.ot,oa:newValue}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                    if(err){
                      console.log(err);
                    }else{
                      User.updateOne({email:user.email}, {$set:{wallet:user.wallet+amount}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });
                    }
                  });
                  const alert = "Swap success"
                  const alertType = "success"

                  res.render("wallet", {status: foundUser.status,wallet:foundUser.wallet,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});

                });
              }
            });
          }
        }
    });
  }
});

app.post('/crypto-withdraw', function(req, res){
  if(!req.session.user){
    res.redirect("/login");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      let d = new Date();
      let year = d.getFullYear();
      let month = d.getMonth() + 1;
      let date = d.getDate();
      let hour = d.getHours() ;
      let minutes = d.getMinutes();
      const currentTime = hour + ":" + minutes;
      const currentDate =  date + "/" + month + "/" + year;
      const usrID = foundUser.userID;
      const ri = foundUser.earnings.ab.ri;
      const wb = foundUser.earnings.ab.wb;
      const nw = foundUser.earnings.ab.nw;
      const rii = foundUser.earnings.ri;
      const amount = Number(req.body.amount);
      const type = req.body.type;

        if(type == 'referral'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              if(foundUser.status == 'Active+'){
                if(foundUser.bankDetails){
                    res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }else{
                    res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                }
              }else{
                if(foundUser.bankDetails){
                    res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                }else{
                    res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                }
              }
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const rii = foundUser.earnings.ri;
                if(ri< req.body.amount){
                    const alert = "Low Balance, please try again."
                    const alertType = "warning"

                    if(foundUser.status == 'Active+'){
                      if(foundUser.bankDetails){
                          res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }else{
                          res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                      }
                    }else{
                      if(foundUser.bankDetails){
                          res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                      }else{
                          res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                      }
                    }
                  }else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.ri - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });
                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'referral',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'referral',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      if(user.status == "Active"){
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot: user.earnings.ab.ot,oa: user.earnings.ab.oa, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri,oa: user.earnings.oa,ot: user.earnings.ot, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }

                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        if(req.body.ethereum == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Ethereum',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.bitcoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.ethereum + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Bitcoin',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.litecoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.ethereum,
                          amount: req.body.amount,
                          bankName: "Litecoin",
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)


                      // create reusable transporter object using the default SMTP transport
                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"
                      if(foundUser.status == 'Active+'){
                        if(foundUser.bankDetails){
                            res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }else{
                            res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }
                      }else{
                        if(foundUser.bankDetails){
                            res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                        }else{
                            res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                        }
                      }
                    });
                }

            });
          }
        }
        if(type == 'autobot'){
          if(nw< amount){
            const alert = "Low Balance, please try again."
            const alertType = "danger"

            if(foundUser.status == 'Active+'){
              if(foundUser.bankDetails){
                  res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              }else{
                  res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              }
            }else{
              if(foundUser.bankDetails){
                  res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
              }else{
                  res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
              }
            }

          }else{

              if(rii === 0){
                const alert = "One direct referral is required"
                const alertType = "danger"

                if(foundUser.status == 'Active+'){
                  if(foundUser.bankDetails){
                      res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }else{
                      res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }
                }else{
                  if(foundUser.bankDetails){
                      res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                  }else{
                      res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                  }
                }
              }
              else{
                if(req.body.amount < 2){
                  const alert = "Amount is less than minimum withdrawal "
                  const alertType = "warning"

                  if(foundUser.status == 'Active+'){
                    if(foundUser.bankDetails){
                        res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }else{
                        res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }
                  }else{
                    if(foundUser.bankDetails){
                        res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                    }else{
                        res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                    }
                  }

                }else{
                    User.findOne({email: req.session.user.email}, function(err, user){

                        const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                        const newValue = user.earnings.ab.nw - req.body.amount;
                        const history = user.history;
                        const newHistory = {
                          alertType: "warning",
                          status: "Pending",
                          amount: req.body.amount,
                          time: currentTime + ", " + currentDate,
                          payment_id: random
                        };
                        history.push(newHistory);
                        User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        if(user.transaction){
                          const transaction = user.transaction;
                          const newTran = {
                            type: 'autobot',
                            mode: 'debit',
                            amount: req.body.amount,
                            date: currentDate
                          };
                          transaction.push(newTran);
                          User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          const newTran = {
                            type: 'autobot',
                            mode: 'debit',
                            amount: req.body.amount,
                            date: currentDate
                          };
                          User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }
                        if(user.status == "Active"){
                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }else{
                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                        }


                        Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                          if(req.body.ethereum == 'on'){
                          const withdrawal = foundUser.withdrawals;
                          const newWithdraw = {
                            name: user.bankDetails.name,
                            email: user.email,
                            accountNumber: req.body.address,
                            ifsc: req.body.bitcoin + req.body.litecoin,
                            amount: req.body.amount,
                            bankName: 'Ethereum',
                            date: currentTime + ", " + currentDate,
                            payment_id: random,
                            from: type
                          }
                          withdrawal.push(newWithdraw);
                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                          }
                          if(req.body.bitcoin == 'on'){
                          const withdrawal = foundUser.withdrawals;
                          const newWithdraw = {
                            name: user.bankDetails.name,
                            email: user.email,
                            accountNumber: req.body.address,
                            ifsc: req.body.ethereum + req.body.litecoin,
                            amount: req.body.amount,
                            bankName: 'Bitcoin',
                            date: currentTime + ", " + currentDate,
                            payment_id: random,
                            from: type
                          }
                          withdrawal.push(newWithdraw);
                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                          }
                          if(req.body.litecoin == 'on'){
                          const withdrawal = foundUser.withdrawals;
                          const newWithdraw = {
                            name: user.bankDetails.name,
                            email: user.email,
                            accountNumber: req.body.address,
                            ifsc: req.body.bitcoin + req.body.ethereum,
                            amount: req.body.amount,
                            bankName: "Litecoin",
                            date: currentTime + ", " + currentDate,
                            payment_id: random,
                            from: type
                          }
                          withdrawal.push(newWithdraw);
                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                            if(err){
                              console.log(err);
                            }
                          });
                          }
                        });
                        var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                        fast2sms.sendMessage(options)

                        const transporter = nodemailer.createTransport({
                          host: 'smtp.gmail.com',
                          port: 465,
                          secure: true,
                          auth: {
                            user: process.env.SEND_EMAIL, // generated ethereal user
                            pass: process.env.REAL_PASSWORD, // generated ethereal password
                          },
                        });

                        // send mail with defined transport object
                        const mailOptions ={
                          from: process.env.SEND_EMAIL, // sender address
                          to: process.env.WITHDRAW, // list of receivers
                          subject: "NEW WITHDRAWAL REQUEST", // Subject line
                          text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                        }
                        transporter.sendMail(mailOptions, function(err, info){
                          if(err){
                            console.log(err);
                          }
                        });


                        const alert = "Withdrawal success"
                        const alertType = "success"

                        if(foundUser.status == 'Active+'){
                          if(foundUser.bankDetails){
                              res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                          }else{
                              res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                          }
                        }else{
                          if(foundUser.bankDetails){
                              res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                          }else{
                              res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                          }
                        }
                      });
                  }
                }
          }
        }
        if(type == 'superUser'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              res.render("withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, usrID, ri, wb, nw});
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;

              if(wb< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                if(foundUser.status == 'Active+'){
                  if(foundUser.bankDetails){
                      res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }else{
                      res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                  }
                }else{
                  if(foundUser.bankDetails){
                      res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                  }else{
                      res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                  }
                }
              }else{
                if(!foundUser.bankDetails){
                  const alert = "Please provide your bank details"
                  const alertType = "danger"

                  if(foundUser.status == 'Active+'){
                    if(foundUser.bankDetails){
                        res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }else{
                        res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                    }
                  }else{
                    if(foundUser.bankDetails){
                        res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                    }else{
                        res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                    }
                  }
                } else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.wb - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'level',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'level',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      if(user.status == "Active"){
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri,ot:user.earnings.ot,oa:user.earnings.oa, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }

                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        if(req.body.ethereum == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Ethereum',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.bitcoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.ethereum + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Bitcoin',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.litecoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.ethereum,
                          amount: req.body.amount,
                          bankName: "Litecoin",
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)

                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"

                      if(foundUser.status == 'Active+'){
                        if(foundUser.bankDetails){
                            res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }else{
                            res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
                        }
                      }else{
                        if(foundUser.bankDetails){
                            res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType},bank: foundUser.bankDetails, ri, wb, nw});
                        }else{
                            res.render("crypto-withdrawal", {status: foundUser.status,alert:{alert, alertType}, ri, wb, nw});
                        }
                      }
                    });
                }
              }
            });
          }
        }
        if(type == 'trial'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
            });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const ot = foundUser.earnings.ab.ot;
              const oa = foundUser.earnings.ab.oa;

              if(ot< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                res.render("withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
             }else{
                if(!foundUser.bankDetails){
                  const alert = "Please provide your bank details"
                  const alertType = "danger"

                  res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              } else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.ot - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'trial',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'trial',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:newValue,oa:user.earnings.ab.oa}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });


                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        if(req.body.ethereum == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Ethereum',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.bitcoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.ethereum + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Bitcoin',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.litecoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.ethereum,
                          amount: req.body.amount,
                          bankName: "Litecoin",
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)

                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"

                      res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});

                    });
                }
              }
            });
          }

        }
        if(type == 'arc'){
          if(amount<2){
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const alert = "Amount is less than minimum withdrawal "
              const alertType = "warning"

              res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
          });
          }else{
            User.findOne({email: req.session.user.email}, function(err, foundUser){
              const usrID = foundUser.userID;
              const ri = foundUser.earnings.ab.ri;
              const wb = foundUser.earnings.ab.wb;
              const nw = foundUser.earnings.ab.nw;
              const ot = foundUser.earnings.ab.ot;
              const oa = foundUser.earnings.ab.oa;

              if(oa< req.body.amount){
                const alert = "Low Balance, please try again."
                const alertType = "warning"

                res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
            }else{
                if(!foundUser.bankDetails){
                  const alert = "Please provide your bank details"
                  const alertType = "danger"

                  res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});
              } else{
                  User.findOne({email: req.session.user.email}, function(err, user){

                      const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                      const newValue = user.earnings.ab.oa - req.body.amount;
                      const history = user.history;
                      const newHistory = {
                        alertType: "warning",
                        status: "Pending",
                        amount: req.body.amount,
                        time: currentTime + ", " + currentDate,
                        payment_id: random,
                        from: type
                      };
                      history.push(newHistory);
                      User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });

                      if(user.transaction){
                        const transaction = user.transaction;
                        const newTran = {
                          type: 'arc',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        transaction.push(newTran);
                        User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }else{
                        const newTran = {
                          type: 'arc',
                          mode: 'debit',
                          amount: req.body.amount,
                          date: currentDate
                        };
                        User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                      User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:user.earnings.ab.ot,oa:newValue}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                        if(err){
                          console.log(err);
                        }
                      });


                      User.updateOne({email: user.email}, {$set:{}})
                      Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                        if(req.body.ethereum == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Ethereum',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.bitcoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.ethereum + req.body.litecoin,
                          amount: req.body.amount,
                          bankName: 'Bitcoin',
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                        if(req.body.litecoin == 'on'){
                        const withdrawal = foundUser.withdrawals;
                        const newWithdraw = {
                          name: user.bankDetails.name,
                          email: user.email,
                          accountNumber: req.body.address,
                          ifsc: req.body.bitcoin + req.body.ethereum,
                          amount: req.body.amount,
                          bankName: "Litecoin",
                          date: currentTime + ", " + currentDate,
                          payment_id: random,
                          from: type
                        }
                        withdrawal.push(newWithdraw);
                        Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                        }
                      });
                      var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                      fast2sms.sendMessage(options)

                      const transporter = nodemailer.createTransport({
                        host: 'smtp.gmail.com',
                        port: 465,
                        secure: true,
                        auth: {
                          user: process.env.SEND_EMAIL, // generated ethereal user
                          pass: process.env.REAL_PASSWORD, // generated ethereal password
                        },
                      });

                      // send mail with defined transport object
                      const mailOptions ={
                        from: process.env.SEND_EMAIL, // sender address
                        to: process.env.WITHDRAW, // list of receivers
                        subject: "NEW WITHDRAWAL REQUEST", // Subject line
                        text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                      }
                      transporter.sendMail(mailOptions, function(err, info){
                        if(err){
                          console.log(err);
                        }
                      });

                      const alert = "Withdrawal success"
                      const alertType = "success"

                      res.render("crypto-withdrawal", {status: foundUser.status,bank: foundUser.bankDetails,alert:{alert, alertType}, ri, wb, nw,ot:foundUser.earnings.ab.ot,oa:foundUser.earnings.ab.oa});

                    });
                }
              }
            });
          }

        }


    });
  }
});

app.post("/api/totp-secret", (req, res, next) => {
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;

  if(!req.session.user.email){
    res.redirect('/login');
  }else{
      User.findOne({email: req.session.user.email}, function(err, foundUser){
        if(err){
          console.log(err)
        }else{
          if(foundUser){
            if(!foundUser.secret){
                const secret = speakeasy.generateSecret({length: 12});
                qrcode.toDataURL(secret.otpauth_url, function(err, data){
                  if(err){
                    console.log(err)
                  }else{
                    res.send({ "secret": secret.base32, "data": data, "exist": false});
                  }
                });
            }else{
              if(req.body.section == 'crypto_withdrawal'){
                User.findOne({email: req.session.user.email}, function(err, foundUser){
                  let d = new Date();
                  let year = d.getFullYear();
                  let month = d.getMonth() + 1;
                  let date = d.getDate();
                  let hour = d.getHours() ;
                  let minutes = d.getMinutes();
                  const currentTime = hour + ":" + minutes;
                  const currentDate =  date + "/" + month + "/" + year;
                  const usrID = foundUser.userID;
                  const ri = foundUser.earnings.ab.ri;
                  const wb = foundUser.earnings.ab.wb;
                  const nw = foundUser.earnings.ab.nw;
                  const rii = foundUser.earnings.ri;
                  const amount = Number(req.body.amount);
                  const type = req.body.type;

                    if(type == 'referral'){
                      if(amount<2){
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const alert = "Amount is less than minimum withdrawal "
                          const alertType = "warning"


                          res.send({ "exist": true, alert:{alert, alertType}});
                        });
                      }else{
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const rii = foundUser.earnings.ri;
                            if(ri< req.body.amount){
                                const alert = "Low Balance, please try again."
                                const alertType = "warning"


                                res.send({ "exist": true, alert:{alert, alertType}});
                              }else{
                                const alert = "Withdrawal success"
                                const alertType = "success"

                                res.send({ "exist": true, alert:{alert, alertType}});
                            }

                        });
                      }
                    }
                    if(type == 'autobot'){
                      if(nw< amount){
                        const alert = "Low Balance, please try again."
                        const alertType = "danger"

                        res.send({ "exist": true, alert:{alert, alertType}});

                      }else{

                          if(rii === 0){
                            const alert = "One direct referral is required"
                            const alertType = "danger"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }
                          else{
                            if(req.body.amount < 2){
                              const alert = "Amount is less than minimum withdrawal "
                              const alertType = "warning"

                              res.send({ "exist": true, alert:{alert, alertType}});

                            }else{
                              const alert = "Withdrawal success"
                              const alertType = "success"

                              res.send({ "exist": true, alert:{alert, alertType}});
                              }
                            }
                      }
                    }
                    if(type == 'superUser'){
                      if(amount<2){
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const alert = "Amount is less than minimum withdrawal "
                          const alertType = "warning"

                          res.send({ "exist": true, alert:{alert, alertType}});
                        });
                      }else{
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;

                          if(wb< req.body.amount){
                            const alert = "Low Balance, please try again."
                            const alertType = "warning"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }else{
                            const alert = "Withdrawal success"
                            const alertType = "success"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }
                        });
                      }
                    }
                    if(type == 'trial'){
                      if(amount<2){
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const alert = "Amount is less than minimum withdrawal "
                          const alertType = "warning"

                          res.send({ "exist": true, alert:{alert, alertType}});
                        });
                      }else{
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const ot = foundUser.earnings.ab.ot;
                          const oa = foundUser.earnings.ab.oa;

                          if(ot< req.body.amount){
                            const alert = "Low Balance, please try again."
                            const alertType = "warning"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }else{
                            const alert = "Withdrawal success"
                            const alertType = "success"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }
                        });
                      }

                    }
                    if(type == 'arc'){
                      if(amount<2){
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const alert = "Amount is less than minimum withdrawal "
                          const alertType = "warning"

                          res.send({ "exist": true, alert:{alert, alertType}});
                        });
                      }else{
                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const ot = foundUser.earnings.ab.ot;
                          const oa = foundUser.earnings.ab.oa;

                          if(oa< req.body.amount){
                            const alert = "Low Balance, please try again."
                            const alertType = "warning"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }else{
                            const alert = "Withdrawal success"
                            const alertType = "success"

                            res.send({ "exist": true, alert:{alert, alertType}});
                          }
                        });
                      }

                    }


                });
              }else{
                if(req.body.section == 'activation'){
                  User.findOne({email:req.session.user.email}, function(err, foundUser){
                    if(err){
                      console.log(err);
                    }else{
                      User.findOne({sponID: req.body.sponID}, function(error, sponsorUser){
                        if(error){
                          console.log(error);
                        }else{
                         if(sponsorUser){
                           const email = sponsorUser.email;
                             if(sponsorUser.status == 'Inactive'){
                               if(foundUser.wallet > 24){
                                 const alert = 'success'
                                 const alertType = 'success'
                                 res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                               }else{
                                 //low balance
                                 const alert = 'Low balance'
                                 const alertType = 'warning'
                                 res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                              }
                             }else{
                               // redirect back to activation page
                               const alert = 'ID is already in Active state'
                               const alertType = 'warning'
                               res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                             }
                         }else{
                           //redirect back to payment portal
                           const alert = 'No user found, please try again'
                           const alertType = 'warning'
                           res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                         }
                        }
                      })
                    }
                  });
                }else{
                  User.findOne({email:req.session.user.email}, function(err, foundUser){
                    if(err){
                      console.log(err);
                    }else{
                      User.findOne({sponID: req.body.sponID}, function(error, sponsorUser){
                        if(error){
                          console.log(error);
                        }else{
                         if(sponsorUser){
                           const email = sponsorUser.email;
                             if(sponsorUser.status == 'Active'){
                               if(foundUser.wallet > 49){
                                 const alert = 'success'
                                 const alertType = 'success'
                                 res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                               }else{
                                 //low balance
                                 const alert = 'Low balance'
                                 const alertType = 'warning'
                                 res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                              }
                             }else{
                               // redirect back to activation page
                               const alert = 'ID is already in Active+ state'
                               const alertType = 'warning'
                               res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                             }
                         }else{
                           //redirect back to payment portal
                           const alert = 'No user found, please try again'
                           const alertType = 'warning'
                           res.send({ "exist": true, sponID: req.body.sponID, section: req.body.section,alert:{alert,alertType}});
                         }
                        }
                      })
                    }
                  });
                }
              }
            }
          }
        }
      });
  }

});

app.post('/api/totp-validate', (req, res, next) =>{
  let d = new Date();
  let year = d.getFullYear();
  let month = d.getMonth() + 1;
  let date = d.getDate();
  let hour = d.getHours() ;
  let minutes = d.getMinutes();
  const updated = date + "/" + month + "/" + year;
  if(!req.session.user.email){
    res.redirect('/login');
  }else{

      User.findOne({email: req.session.user.email}, function(err, foundUser){
        if(err){
          console.log(err)
        }else{
          if(foundUser){
            if(!foundUser.secret){
              User.updateOne({email: foundUser.email}, {$set:{secret:req.body.secret}}, function(err){
                if(err){
                  console.log(err);
                }else{
                  res.send({message:"secret updated successfully"});
                }
              });
            }else{
              const valid = speakeasy.totp.verify({
                  secret: foundUser.secret,
                  encoding: "base32",
                  token: req.body.token,
                  window: 0
              })
              if(valid == true){
                if(req.body.section == 'activation'){

                    res.send({
                        "valid": speakeasy.totp.verify({
                            secret: foundUser.secret,
                            encoding: "base32",
                            token: req.body.token,
                            window: 0
                        })
                    });
                  User.findOne({email:req.session.user.email}, function(err, foundUser){
                    if(err){
                      console.log(err);
                    }else{
                      User.findOne({sponID: req.body.sponID}, function(error, sponsorUser){
                        if(error){
                          console.log(error);
                        }else{
                          const email = sponsorUser.email;
                         if(sponsorUser){
                           //process it
                           //For Basic Plan
                           User.updateOne({email: email},{$set:{status: "Active"}}, function(err){
                             if(err){
                               console.log(err);
                             }else{
                               User.updateOne({email:foundUser.email}, {$set:{wallet:foundUser.wallet - 25}}, function(error){
                                 if(error){
                                   console.log(error);
                                 }
                               });
                               if(foundUser.transaction){
                                 const transaction = foundUser.transaction;
                                 const newTran = {
                                   type: 'basic',
                                   mode: 'debit',
                                   amount: '25',
                                   date: updated
                                 };
                                 transaction.push(newTran);
                                 User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                                   if(err){
                                     console.log(err);
                                   }
                                 });
                               }else{
                                 const newTran = {
                                   type: 'basic',
                                   mode: 'debit',
                                   amount: '25',
                                   date: updated
                                 };
                                 User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                                   if(err){
                                     console.log(err);
                                   }
                                 });
                               }
                             }
                           });
                           User.updateOne({email: email},{$set:{time: updated }}, function(err){
                             if(err){
                               console.log(err);
                             }
                           });

                           // Referral points
                           User.findOne({sponID: sponsorUser.sponsorID}, function(err, sponUser){
                             if(err){
                               console.log(err);
                             }else{
                               if(sponUser){
                                 if(sponUser.status == "Active"){
                                   User.updateOne({sponID: sponsorUser.sponsorID},
                                     {$set:{earnings:{
                                       ab:{
                                         ri: sponUser.earnings.ab.ri + 10,
                                         wb: sponUser.earnings.ab.wb,
                                         nw: sponUser.earnings.ab.nw
                                       },
                                       te: sponUser.earnings.te + 10,
                                       ri: sponUser.earnings.ri + 10,
                                       wb: sponUser.earnings.wb,
                                       nw: sponUser.earnings.nw
                                     }}},  function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                   if(sponUser.transaction){
                                     const transaction = sponUser.transaction;
                                     const newTran = {
                                       type: 'referral',
                                       mode: 'credit',
                                       amount: '10',
                                       date: updated
                                     };
                                     transaction.push(newTran);
                                     User.updateOne({email: sponUser.email}, {$set:{transaction:transaction}}, function(err){
                                       if(err){
                                         console.log(err);
                                       }
                                     });
                                   }else{
                                     const newTran = {
                                       type: 'referral',
                                       mode: 'credit',
                                       amount: '10',
                                       date: updated
                                     };
                                     User.updateOne({email: sponUser.email}, {$set:{transaction:newTran}}, function(err){
                                       if(err){
                                         console.log(err);
                                       }
                                     });
                                   }

                               }else{
                                 if(sponUser.status == "Active+"){
                                 User.updateOne({sponID: sponsorUser.sponsorID},
                                   {$set:{earnings:{
                                     ab:{
                                       ri: sponUser.earnings.ab.ri + 10,
                                       wb: sponUser.earnings.ab.wb,
                                       nw: sponUser.earnings.ab.nw,
                                       ot: sponUser.earnings.ab.ot,
                                       oa: sponUser.earnings.ab.oa
                                     },
                                     te: sponUser.earnings.te + 10,
                                     ri: sponUser.earnings.ri + 10,
                                     wb: sponUser.earnings.wb,
                                     nw: sponUser.earnings.nw,
                                     ot: sponUser.earnings.ot,
                                     oa: sponUser.earnings.oa
                                   }}},  function(err){
                                   if(err){
                                     console.log(err);
                                   }
                                 });
                                 if(sponUser.transaction){
                                   const transaction = sponUser.transaction;
                                   const newTran = {
                                     type: 'referral',
                                     mode: 'credit',
                                     amount: '10',
                                     date: updated
                                   };
                                   transaction.push(newTran);
                                   User.updateOne({email: sponUser.email}, {$set:{transaction:transaction}}, function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                 }else{
                                   const newTran = {
                                     type: 'referral',
                                     mode: 'credit',
                                     amount: '10',
                                     date: updated
                                   };
                                   User.updateOne({email: sponUser.email}, {$set:{transaction:newTran}}, function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                 }
                               }
                               }
                            // level points
                              User.findOne({sponID: sponUser.sponsorID}, function(err, firstUser){
                              if(err){
                                console.log(err);
                              } else {
                                if(firstUser){
                                  if(firstUser.status === "Active+"){
                                    User.updateOne({sponID: sponUser.sponsorID},
                                      {$set:{earnings:{
                                        ab:{
                                          ri: firstUser.earnings.ab.ri,
                                          wb: firstUser.earnings.ab.wb + 0.5,
                                          nw: firstUser.earnings.ab.nw,
                                          ot: firstUser.earnings.ab.ot,
                                          oa: firstUser.earnings.ab.oa
                                        },
                                        te: firstUser.earnings.te + 0.5,
                                        ri: firstUser.earnings.ri,
                                        wb: firstUser.earnings.wb + 0.5,
                                        nw: firstUser.earnings.nw,
                                        ot: firstUser.earnings.ot,
                                        oa: firstUser.earnings.oa
                                      }}},  function(err){
                                      if(err){
                                        console.log(err);
                                      }
                                    });

                                    if(firstUser.transaction){
                                      const transaction = firstUser.transaction;
                                      const newTran = {
                                        type: 'level-1',
                                        mode: 'credit',
                                        amount: '0.5',
                                        date: updated
                                      };
                                      transaction.push(newTran);
                                      User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });
                                    }else{
                                      const newTran = {
                                        type: 'level-1',
                                        mode: 'credit',
                                        amount: '0.5',
                                        date: updated
                                      };
                                      User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });
                                    }

                                  }


                                    if(firstUser.status === "Active"){
                                      User.updateOne({sponID: sponUser.sponsorID},
                                        {$set:{earnings:{
                                          ab:{
                                            ri: firstUser.earnings.ab.ri,
                                            wb: firstUser.earnings.ab.wb + 0.5,
                                            nw: firstUser.earnings.ab.nw
                                          },
                                          te: firstUser.earnings.te + 0.5,
                                          ri: firstUser.earnings.ri,
                                          wb: firstUser.earnings.wb + 0.5,
                                          nw: firstUser.earnings.nw
                                        }}},  function(err){
                                        if(err){
                                          console.log(err);
                                        }
                                      });

                                      if(firstUser.transaction){
                                        const transaction = firstUser.transaction;
                                        const newTran = {
                                          type: 'level-1',
                                          mode: 'credit',
                                          amount: '0.5',
                                          date: updated
                                        };
                                        transaction.push(newTran);
                                        User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });
                                      }else{
                                        const newTran = {
                                          type: 'level-1',
                                          mode: 'credit',
                                          amount: '0.5',
                                          date: updated
                                        };
                                        User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });
                                      }

                                    }

                                    User.findOne({sponID: firstUser.sponsorID}, function(err, secondUser){
                                      if(err){
                                        console.log(err);
                                      }else{
                                        if(secondUser){
                                          if(secondUser.status === "Active+"){
                                            User.updateOne({sponID: firstUser.sponsorID},
                                              {$set:{earnings:{
                                                ab:{
                                                  ri: secondUser.earnings.ab.ri,
                                                  wb: secondUser.earnings.ab.wb + 0.5,
                                                  nw: secondUser.earnings.ab.nw,
                                                  ot: secondUser.earnings.ab.ot,
                                                  oa: secondUser.earnings.ab.oa
                                                },
                                                te: secondUser.earnings.te + 0.5,
                                                ri: secondUser.earnings.ri,
                                                wb: secondUser.earnings.wb + 0.5,
                                                nw: secondUser.earnings.nw,
                                                ot: secondUser.earnings.ot,
                                                oa: secondUser.earnings.oa
                                              }}},  function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });

                                            if(secondUser.transaction){
                                              const transaction = secondUser.transaction;
                                              const newTran = {
                                                type: 'level-2',
                                                mode: 'credit',
                                                amount: '0.5',
                                                date: updated
                                              };
                                              transaction.push(newTran);
                                              User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              const newTran = {
                                                type: 'level-2',
                                                mode: 'credit',
                                                amount: '0.5',
                                                date: updated
                                              };
                                              User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }
                                          }

                                          if(secondUser.status === "Active"){
                                              User.updateOne({sponID: firstUser.sponsorID},
                                                {$set:{earnings:{
                                                  ab:{
                                                    ri: secondUser.earnings.ab.ri,
                                                    wb: secondUser.earnings.ab.wb + 0.5,
                                                    nw: secondUser.earnings.ab.nw
                                                  },
                                                  te: secondUser.earnings.te + 0.5,
                                                  ri: secondUser.earnings.ri,
                                                  wb: secondUser.earnings.wb + 0.5,
                                                  nw: secondUser.earnings.nw
                                                }}},  function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });

                                              if(secondUser.transaction){
                                                const transaction = secondUser.transaction;
                                                const newTran = {
                                                  type: 'level-2',
                                                  mode: 'credit',
                                                  amount: '0.5',
                                                  date: updated
                                                };
                                                transaction.push(newTran);
                                                User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                                  if(err){
                                                    console.log(err);
                                                  }
                                                });
                                              }else{
                                                const newTran = {
                                                  type: 'level-2',
                                                  mode: 'credit',
                                                  amount: '0.5',
                                                  date: updated
                                                };
                                                User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                                  if(err){
                                                    console.log(err);
                                                  }
                                                });
                                              }
                                            }

                                            //Third User
                                            User.findOne({sponID:secondUser.sponsorID}, function(err, thirdUser){
                                              if(err){
                                                console.log(err);
                                              }else{
                                                if(thirdUser){
                                                  if(thirdUser.status === "Active+"){
                                                    User.updateOne({sponID: secondUser.sponsorID},
                                                      {$set:{earnings:{
                                                        ab:{
                                                          ri: thirdUser.earnings.ab.ri,
                                                          wb: thirdUser.earnings.ab.wb + 0.5,
                                                          nw: thirdUser.earnings.ab.nw,
                                                          ot: thirdUser.earnings.ab.ot,
                                                          oa: thirdUser.earnings.ab.oa
                                                        },
                                                        te: thirdUser.earnings.te + 0.5,
                                                        ri: thirdUser.earnings.ri,
                                                        wb: thirdUser.earnings.wb + 0.5,
                                                        nw: thirdUser.earnings.nw,
                                                        ot: thirdUser.earnings.ot,
                                                        oa: thirdUser.earnings.oa
                                                      }}},  function(err){
                                                      if(err){
                                                        console.log(err);
                                                      }
                                                    });


                                                    if(thirdUser.transaction){
                                                      const transaction = thirdUser.transaction;
                                                      const newTran = {
                                                        type: 'level-3',
                                                        mode: 'credit',
                                                        amount: '0.5',
                                                        date: updated
                                                      };
                                                      transaction.push(newTran);
                                                      User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                        if(err){
                                                          console.log(err);
                                                        }
                                                      });
                                                    }else{
                                                      const newTran = {
                                                        type: 'level-3',
                                                        mode: 'credit',
                                                        amount: '0.5',
                                                        date: updated
                                                      };
                                                      User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                        if(err){
                                                          console.log(err);
                                                        }
                                                      });
                                                    }
                                                  }

                                                  if(thirdUser.status === "Active"){
                                                      User.updateOne({sponID: secondUser.sponsorID},
                                                        {$set:{earnings:{
                                                          ab:{
                                                            ri: thirdUser.earnings.ab.ri,
                                                            wb: thirdUser.earnings.ab.wb + 0.5,
                                                            nw: thirdUser.earnings.ab.nw
                                                          },
                                                          te: thirdUser.earnings.te + 0.5,
                                                          ri: thirdUser.earnings.ri,
                                                          wb: thirdUser.earnings.wb + 0.5,
                                                          nw: thirdUser.earnings.nw
                                                        }}},  function(err){
                                                        if(err){
                                                          console.log(err);
                                                        }
                                                      });


                                                      if(thirdUser.transaction){
                                                        const transaction = thirdUser.transaction;
                                                        const newTran = {
                                                          type: 'level-3',
                                                          mode: 'credit',
                                                          amount: '0.5',
                                                          date: updated
                                                        };
                                                        transaction.push(newTran);
                                                        User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                          if(err){
                                                            console.log(err);
                                                          }
                                                        });
                                                      }else{
                                                        const newTran = {
                                                          type: 'level-3',
                                                          mode: 'credit',
                                                          amount: '0.5',
                                                          date: updated
                                                        };
                                                        User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                          if(err){
                                                            console.log(err);
                                                          }
                                                        });
                                                      }
                                                    }

                                                    //Forth User
                                                    User.findOne({sponID:thirdUser.sponsorID}, function(err, fourthUser){
                                                      if(err){
                                                        console.log(err);
                                                      }else{
                                                        if(fourthUser){
                                                          if(fourthUser.status === "Active+"){
                                                            User.updateOne({sponID: thirdUser.sponsorID},
                                                              {$set:{earnings:{
                                                                ab:{
                                                                  ri: fourthUser.earnings.ab.ri,
                                                                  wb: fourthUser.earnings.ab.wb + 0.5,
                                                                  nw: fourthUser.earnings.ab.nw,
                                                                  ot: fourthUser.earnings.ab.ot,
                                                                  oa: fourthUser.earnings.ab.oa
                                                                },
                                                                te: fourthUser.earnings.te + 0.5,
                                                                ri: fourthUser.earnings.ri,
                                                                wb: fourthUser.earnings.wb + 0.5,
                                                                nw: fourthUser.earnings.nw,
                                                                ot: fourthUser.earnings.ot,
                                                                oa: fourthUser.earnings.oa
                                                              }}},  function(err){
                                                              if(err){
                                                                console.log(err);
                                                              }
                                                            });


                                                            if(fourthUser.transaction){
                                                              const transaction = fourthUser.transaction;
                                                              const newTran = {
                                                                type: 'level-4',
                                                                mode: 'credit',
                                                                amount: '0.5',
                                                                date: updated
                                                              };
                                                              transaction.push(newTran);
                                                              User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });
                                                            }else{
                                                              const newTran = {
                                                                type: 'level-4',
                                                                mode: 'credit',
                                                                amount: '0.5',
                                                                date: updated
                                                              };
                                                              User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });
                                                            }
                                                          }


                                                          if(fourthUser.status === "Active"){
                                                              User.updateOne({sponID: thirdUser.sponsorID},
                                                                {$set:{earnings:{
                                                                  ab:{
                                                                    ri: fourthUser.earnings.ab.ri,
                                                                    wb: fourthUser.earnings.ab.wb + 0.5,
                                                                    nw: fourthUser.earnings.ab.nw
                                                                  },
                                                                  te: fourthUser.earnings.te + 0.5,
                                                                  ri: fourthUser.earnings.ri,
                                                                  wb: fourthUser.earnings.wb + 0.5,
                                                                  nw: fourthUser.earnings.nw
                                                                }}},  function(err){
                                                                if(err){
                                                                  console.log(err);
                                                                }
                                                              });


                                                              if(fourthUser.transaction){
                                                                const transaction = fourthUser.transaction;
                                                                const newTran = {
                                                                  type: 'level-4',
                                                                  mode: 'credit',
                                                                  amount: '0.5',
                                                                  date: updated
                                                                };
                                                                transaction.push(newTran);
                                                                User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                  if(err){
                                                                    console.log(err);
                                                                  }
                                                                });
                                                              }else{
                                                                const newTran = {
                                                                  type: 'level-4',
                                                                  mode: 'credit',
                                                                  amount: '0.5',
                                                                  date: updated
                                                                };
                                                                User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                  if(err){
                                                                    console.log(err);
                                                                  }
                                                                });
                                                              }
                                                            }

                                                            //fifth User
                                                            User.findOne({sponID:fourthUser.sponsorID}, function(err, fifthUser){
                                                              if(err){
                                                                console.log(err);
                                                              }else{
                                                                if(fifthUser){
                                                                  if(fifthUser.status === "Active+"){
                                                                    User.updateOne({sponID: fourthUser.sponsorID},
                                                                      {$set:{earnings:{
                                                                        ab:{
                                                                          ri: fifthUser.earnings.ab.ri,
                                                                          wb: fifthUser.earnings.ab.wb + 0.5,
                                                                          nw: fifthUser.earnings.ab.nw,
                                                                          ot: fifthUser.earnings.ab.ot,
                                                                          oa: fifthUser.earnings.ab.oa
                                                                        },
                                                                        te: fifthUser.earnings.te + 0.5,
                                                                        ri: fifthUser.earnings.ri,
                                                                        wb: fifthUser.earnings.wb + 0.5,
                                                                        nw: fifthUser.earnings.nw,
                                                                        ot: fifthUser.earnings.ot,
                                                                        oa: fifthUser.earnings.oa
                                                                      }}},  function(err){
                                                                      if(err){
                                                                        console.log(err);
                                                                      }
                                                                    });


                                                                    if(fifthUser.transaction){
                                                                      const transaction = fifthUser.transaction;
                                                                      const newTran = {
                                                                        type: 'level-5',
                                                                        mode: 'credit',
                                                                        amount: '0.5',
                                                                        date: updated
                                                                      };
                                                                      transaction.push(newTran);
                                                                      User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });
                                                                    }else{
                                                                      const newTran = {
                                                                        type: 'level-5',
                                                                        mode: 'credit',
                                                                        amount: '0.5',
                                                                        date: updated
                                                                      };
                                                                      User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });
                                                                    }
                                                                  }


                                                                  if(fifthUser.status === "Active"){
                                                                      User.updateOne({sponID: fourthUser.sponsorID},
                                                                        {$set:{earnings:{
                                                                          ab:{
                                                                            ri: fifthUser.earnings.ab.ri,
                                                                            wb: fifthUser.earnings.ab.wb + 0.5,
                                                                            nw: fifthUser.earnings.ab.nw
                                                                          },
                                                                          te: fifthUser.earnings.te + 0.5,
                                                                          ri: fifthUser.earnings.ri,
                                                                          wb: fifthUser.earnings.wb + 0.5,
                                                                          nw: fifthUser.earnings.nw
                                                                        }}},  function(err){
                                                                        if(err){
                                                                          console.log(err);
                                                                        }
                                                                      });


                                                                      if(fifthUser.transaction){
                                                                        const transaction = fifthUser.transaction;
                                                                        const newTran = {
                                                                          type: 'level-5',
                                                                          mode: 'credit',
                                                                          amount: '0.5',
                                                                          date: updated
                                                                        };
                                                                        transaction.push(newTran);
                                                                        User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                          if(err){
                                                                            console.log(err);
                                                                          }
                                                                        });
                                                                      }else{
                                                                        const newTran = {
                                                                          type: 'level-5',
                                                                          mode: 'credit',
                                                                          amount: '0.5',
                                                                          date: updated
                                                                        };
                                                                        User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                          if(err){
                                                                            console.log(err);
                                                                          }
                                                                        });
                                                                      }
                                                                    }

                                                                    //sixth User
                                                                    User.findOne({sponID:fifthUser.sponsorID}, function(err, sixthUser){
                                                                      if(err){
                                                                        console.log(err);
                                                                      }else{
                                                                        if(sixthUser){
                                                                          if(sixthUser.status === "Active+"){
                                                                            User.updateOne({sponID: fifthUser.sponsorID},
                                                                              {$set:{earnings:{
                                                                                ab:{
                                                                                  ri: sixthUser.earnings.ab.ri,
                                                                                  wb: sixthUser.earnings.ab.wb + 0.5,
                                                                                  nw: sixthUser.earnings.ab.nw,
                                                                                  ot: sixthUser.earnings.ab.ot,
                                                                                  oa: sixthUser.earnings.ab.oa
                                                                                },
                                                                                te: sixthUser.earnings.te + 0.5,
                                                                                ri: sixthUser.earnings.ri,
                                                                                wb: sixthUser.earnings.wb + 0.5,
                                                                                nw: sixthUser.earnings.nw,
                                                                                ot: sixthUser.earnings.ot,
                                                                                oa: sixthUser.earnings.oa
                                                                              }}},  function(err){
                                                                              if(err){
                                                                                console.log(err);
                                                                              }
                                                                            });


                                                                            if(sixthUser.transaction){
                                                                              const transaction = sixthUser.transaction;
                                                                              const newTran = {
                                                                                type: 'level-6',
                                                                                mode: 'credit',
                                                                                amount: '0.5',
                                                                                date: updated
                                                                              };
                                                                              transaction.push(newTran);
                                                                              User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                                if(err){
                                                                                  console.log(err);
                                                                                }
                                                                              });
                                                                            }else{
                                                                              const newTran = {
                                                                                type: 'level-6',
                                                                                mode: 'credit',
                                                                                amount: '0.5',
                                                                                date: updated
                                                                              };
                                                                              User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                                if(err){
                                                                                  console.log(err);
                                                                                }
                                                                              });
                                                                            }
                                                                          }


                                                                          if(sixthUser.status === "Active"){
                                                                              User.updateOne({sponID: fifthUser.sponsorID},
                                                                                {$set:{earnings:{
                                                                                  ab:{
                                                                                    ri: sixthUser.earnings.ab.ri,
                                                                                    wb: sixthUser.earnings.ab.wb + 0.5,
                                                                                    nw: sixthUser.earnings.ab.nw
                                                                                  },
                                                                                  te: sixthUser.earnings.te + 0.5,
                                                                                  ri: sixthUser.earnings.ri,
                                                                                  wb: sixthUser.earnings.wb + 0.5,
                                                                                  nw: sixthUser.earnings.nw
                                                                                }}},  function(err){
                                                                                if(err){
                                                                                  console.log(err);
                                                                                }
                                                                              });


                                                                              if(sixthUser.transaction){
                                                                                const transaction = sixthUser.transaction;
                                                                                const newTran = {
                                                                                  type: 'level-6',
                                                                                  mode: 'credit',
                                                                                  amount: '0.5',
                                                                                  date: updated
                                                                                };
                                                                                transaction.push(newTran);
                                                                                User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                                  if(err){
                                                                                    console.log(err);
                                                                                  }
                                                                                });
                                                                              }else{
                                                                                const newTran = {
                                                                                  type: 'level-6',
                                                                                  mode: 'credit',
                                                                                  amount: '0.5',
                                                                                  date: updated
                                                                                };
                                                                                User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                                  if(err){
                                                                                    console.log(err);
                                                                                  }
                                                                                });
                                                                              }
                                                                            }
                                                                        }
                                                                      }
                                                                    });
                                                                }
                                                              }
                                                            });
                                                        }
                                                      }
                                                    });
                                                }
                                              }
                                            });
                                        }
                                      }
                                    });
                                }
                              }
                            });
                               }
                             }
                           });
                         }else{
                           //redirect back to payment portal
                           res.redirect('/payment-portal');
                         }
                        }
                      })
                    }
                  });
                }else{
                  if(req.body.section == 'upgradation'){

                      res.send({
                          "valid": speakeasy.totp.verify({
                              secret: foundUser.secret,
                              encoding: "base32",
                              token: req.body.token,
                              window: 0
                          })
                      });
                    User.findOne({email:req.session.user.email}, function(err, foundUser){
                      if(err){
                        console.log(err);
                      }else{
                        User.findOne({sponID: req.body.sponID}, function(error, sponsorUser){
                          if(error){
                            console.log(error);
                          }else{
                           if(sponsorUser){
                             const email = sponsorUser.email;
                             //process it
                             User.updateOne({email: sponsorUser.email},{$set:{status: "Active+"}}, function(err){
                               if(err){
                                 console.log(err);
                               }else{
                                 User.updateOne({email:foundUser.email}, {$set:{wallet:foundUser.wallet - 50}}, function(error){
                                   if(error){
                                     console.log(error);
                                   }
                                 });

                                 if(foundUser.transaction){
                                   const transaction = foundUser.transaction;
                                   const newTran = {
                                     type: 'upgrade',
                                     mode: 'debit',
                                     amount: '50',
                                     date: updated
                                   };
                                   transaction.push(newTran);
                                   User.updateOne({email: foundUser.email}, {$set:{transaction:transaction}}, function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                 }else{
                                   const newTran = {
                                     type: 'upgrade',
                                     mode: 'debit',
                                     amount: '50',
                                     date: updated
                                   };
                                   User.updateOne({email: foundUser.email}, {$set:{transaction:newTran}}, function(err){
                                     if(err){
                                       console.log(err);
                                     }
                                   });
                                 }
                               }
                             });
                             User.updateOne({email: sponsorUser.email},{$set:{wallet: 0}}, function(err){
                               if(err){
                                 console.log(err);
                               }
                             });
                             User.updateOne({email: sponsorUser.email},{$set:{earnings:{
                               ab:{
                                 ri: sponsorUser.earnings.ab.ri,
                                 wb: sponsorUser.earnings.ab.wb,
                                 nw: sponsorUser.earnings.ab.nw,
                                 ot: 0,
                                 oa: 0
                               },
                               te: sponsorUser.earnings.te,
                               ri: sponsorUser.earnings.ri,
                               wb: sponsorUser.earnings.wb,
                               nw: sponsorUser.earnings.nw,
                               ot: 0,
                               oa: 0
                             }}}, function(err){
                               if(err){
                                 console.log(err);
                               }
                             });

                             //  Referral points
                             User.findOne({sponID: sponsorUser.sponsorID}, function(err, firstUser){
                               if(err){
                                 console.log(err);
                               } else {
                                 if(firstUser){
                                   if(firstUser.status === "Active+"){
                                     User.updateOne({sponID: sponsorUser.sponsorID},
                                       {$set:{earnings:{
                                         ab:{
                                           ri: firstUser.earnings.ab.ri,
                                           wb: firstUser.earnings.ab.wb,
                                           nw: firstUser.earnings.ab.nw,
                                           ot: firstUser.earnings.ab.ot + 10,
                                           oa: firstUser.earnings.ab.oa
                                         },
                                         te: firstUser.earnings.te + 10,
                                         ri: firstUser.earnings.ri,
                                         wb: firstUser.earnings.wb,
                                         nw: firstUser.earnings.nw,
                                         ot: firstUser.earnings.ot + 10,
                                         oa: firstUser.earnings.oa
                                       }}},  function(err){
                                       if(err){
                                         console.log(err);
                                       }
                                     });

                                     if(firstUser.transaction){
                                       const transaction = firstUser.transaction;
                                       const newTran = {
                                         type: 'trial-1',
                                         mode: 'credit',
                                         amount: '10',
                                         date: updated
                                       };
                                       transaction.push(newTran);
                                       User.updateOne({email: firstUser.email}, {$set:{transaction:transaction}}, function(err){
                                         if(err){
                                           console.log(err);
                                         }
                                       });
                                     }else{
                                       const newTran = {
                                         type: 'trial-1',
                                         mode: 'credit',
                                         amount: '10',
                                         date: updated
                                       };
                                       User.updateOne({email: firstUser.email}, {$set:{transaction:newTran}}, function(err){
                                         if(err){
                                           console.log(err);
                                         }
                                       });
                                     }

                                   }


                                   User.findOne({sponID: firstUser.sponsorID}, function(err, secondUser){
                                     if(err){
                                       console.log(err);
                                     }else{
                                       if(secondUser){
                                         if(secondUser.status === "Active+"){
                                           User.updateOne({sponID: firstUser.sponsorID},
                                             {$set:{earnings:{
                                               ab:{
                                                 ri: secondUser.earnings.ab.ri,
                                                 wb: secondUser.earnings.ab.wb,
                                                 nw: secondUser.earnings.ab.nw,
                                                 ot: secondUser.earnings.ab.ot + 10,
                                                 oa: secondUser.earnings.ab.oa
                                               },
                                               te: secondUser.earnings.te + 10,
                                               ri: secondUser.earnings.ri,
                                               wb: secondUser.earnings.wb,
                                               nw: secondUser.earnings.nw,
                                               ot: secondUser.earnings.ot + 10,
                                               oa: secondUser.earnings.oa
                                             }}},  function(err){
                                             if(err){
                                               console.log(err);
                                             }
                                           });

                                           if(secondUser.transaction){
                                             const transaction = secondUser.transaction;
                                             const newTran = {
                                               type: 'trial-2',
                                               mode: 'credit',
                                               amount: '10',
                                               date: updated
                                             };
                                             transaction.push(newTran);
                                             User.updateOne({email: secondUser.email}, {$set:{transaction:transaction}}, function(err){
                                               if(err){
                                                 console.log(err);
                                               }
                                             });
                                           }else{
                                             const newTran = {
                                               type: 'trial-2',
                                               mode: 'credit',
                                               amount: '10',
                                               date: updated
                                             };
                                             User.updateOne({email: secondUser.email}, {$set:{transaction:newTran}}, function(err){
                                               if(err){
                                                 console.log(err);
                                               }
                                             });
                                           }
                                         }

                                         //Third User
                                         User.findOne({sponID:secondUser.sponsorID}, function(err, thirdUser){
                                           if(err){
                                             console.log(err);
                                           }else{
                                             if(thirdUser){
                                               if(thirdUser.status === "Active+"){
                                                 User.updateOne({sponID: secondUser.sponsorID},
                                                   {$set:{earnings:{
                                                     ab:{
                                                       ri: thirdUser.earnings.ab.ri,
                                                       wb: thirdUser.earnings.ab.wb,
                                                       nw: thirdUser.earnings.ab.nw,
                                                       ot: thirdUser.earnings.ab.ot + 10,
                                                       oa: thirdUser.earnings.ab.oa
                                                     },
                                                     te: thirdUser.earnings.te + 10,
                                                     ri: thirdUser.earnings.ri,
                                                     wb: thirdUser.earnings.wb,
                                                     nw: thirdUser.earnings.nw,
                                                     ot: thirdUser.earnings.ot + 10,
                                                     oa: thirdUser.earnings.oa
                                                   }}},  function(err){
                                                   if(err){
                                                     console.log(err);
                                                   }
                                                 });


                                                 if(thirdUser.transaction){
                                                   const transaction = thirdUser.transaction;
                                                   const newTran = {
                                                     type: 'trial-3',
                                                     mode: 'credit',
                                                     amount: '10',
                                                     date: updated
                                                   };
                                                   transaction.push(newTran);
                                                   User.updateOne({email: thirdUser.email}, {$set:{transaction:transaction}}, function(err){
                                                     if(err){
                                                       console.log(err);
                                                     }
                                                   });
                                                 }else{
                                                   const newTran = {
                                                     type: 'trial-3',
                                                     mode: 'credit',
                                                     amount: '10',
                                                     date: updated
                                                   };
                                                   User.updateOne({email: thirdUser.email}, {$set:{transaction:newTran}}, function(err){
                                                     if(err){
                                                       console.log(err);
                                                     }
                                                   });
                                                 }
                                               }

                                               //Fourth User
                                               User.findOne({sponID:thirdUser.sponsorID}, function(err, fourthUser){
                                                 if(err){
                                                   console.log(err);
                                                 }else{
                                                   if(fourthUser){
                                                     if(fourthUser.status === "Active+"){
                                                       User.updateOne({sponID: thirdUser.sponsorID},
                                                         {$set:{earnings:{
                                                           ab:{
                                                             ri: fourthUser.earnings.ab.ri,
                                                             wb: fourthUser.earnings.ab.wb,
                                                             nw: fourthUser.earnings.ab.nw,
                                                             ot: fourthUser.earnings.ab.ot + 1,
                                                             oa: fourthUser.earnings.ab.oa
                                                           },
                                                           te: fourthUser.earnings.te + 1,
                                                           ri: fourthUser.earnings.ri,
                                                           wb: fourthUser.earnings.wb,
                                                           nw: fourthUser.earnings.nw,
                                                           ot: fourthUser.earnings.ot + 1,
                                                           oa: fourthUser.earnings.oa
                                                         }}},  function(err){
                                                         if(err){
                                                           console.log(err);
                                                         }
                                                       });


                                                       if(fourthUser.transaction){
                                                         const transaction = fourthUser.transaction;
                                                         const newTran = {
                                                           type: 'network-1',
                                                           mode: 'credit',
                                                           amount: '1',
                                                           date: updated
                                                         };
                                                         transaction.push(newTran);
                                                         User.updateOne({email: fourthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                           if(err){
                                                             console.log(err);
                                                           }
                                                         });
                                                       }else{
                                                         const newTran = {
                                                           type: 'network-1',
                                                           mode: 'credit',
                                                           amount: '1',
                                                           date: updated
                                                         };
                                                         User.updateOne({email: fourthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                           if(err){
                                                             console.log(err);
                                                           }
                                                         });
                                                       }
                                                     }


                                                     //Fifth User
                                                     User.findOne({sponID:fourthUser.sponsorID}, function(err, fifthUser){
                                                       if(err){
                                                         console.log(err);
                                                       }else{
                                                         if(fifthUser){
                                                           if(fifthUser.status === "Active+"){
                                                             User.updateOne({sponID: fourthUser.sponsorID},
                                                               {$set:{earnings:{
                                                                 ab:{
                                                                   ri: fifthUser.earnings.ab.ri,
                                                                   wb: fifthUser.earnings.ab.wb,
                                                                   nw: fifthUser.earnings.ab.nw,
                                                                   ot: fifthUser.earnings.ab.ot + 1,
                                                                   oa: fifthUser.earnings.ab.oa
                                                                 },
                                                                 te: fifthUser.earnings.te + 1,
                                                                 ri: fifthUser.earnings.ri,
                                                                 wb: fifthUser.earnings.wb,
                                                                 nw: fifthUser.earnings.nw,
                                                                 ot: fifthUser.earnings.ot + 1,
                                                                 oa: fifthUser.earnings.oa
                                                               }}},  function(err){
                                                               if(err){
                                                                 console.log(err);
                                                               }
                                                             });


                                                             if(fifthUser.transaction){
                                                               const transaction = fifthUser.transaction;
                                                               const newTran = {
                                                                 type: 'network-2',
                                                                 mode: 'credit',
                                                                 amount: '1',
                                                                 date: updated
                                                               };
                                                               transaction.push(newTran);
                                                               User.updateOne({email: fifthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                 if(err){
                                                                   console.log(err);
                                                                 }
                                                               });
                                                             }else{
                                                               const newTran = {
                                                                 type: 'network-2',
                                                                 mode: 'credit',
                                                                 amount: '1',
                                                                 date: updated
                                                               };
                                                               User.updateOne({email: fifthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                 if(err){
                                                                   console.log(err);
                                                                 }
                                                               });
                                                             }
                                                           }

                                                           //Sixth User
                                                           User.findOne({sponID:fifthUser.sponsorID}, function(err, sixthUser){
                                                             if(err){
                                                               console.log(err);
                                                             }else{
                                                               if(sixthUser){
                                                                 if(sixthUser.status === "Active+"){
                                                                   User.updateOne({sponID: fifthUser.sponsorID},
                                                                     {$set:{earnings:{
                                                                       ab:{
                                                                         ri: sixthUser.earnings.ab.ri,
                                                                         wb: sixthUser.earnings.ab.wb,
                                                                         nw: sixthUser.earnings.ab.nw,
                                                                         ot: sixthUser.earnings.ab.ot + 1,
                                                                         oa: sixthUser.earnings.ab.oa
                                                                       },
                                                                       te: sixthUser.earnings.te + 1,
                                                                       ri: sixthUser.earnings.ri,
                                                                       wb: sixthUser.earnings.wb,
                                                                       nw: sixthUser.earnings.nw,
                                                                       ot: sixthUser.earnings.ot + 1,
                                                                       oa: sixthUser.earnings.oa
                                                                     }}},  function(err){
                                                                     if(err){
                                                                       console.log(err);
                                                                     }
                                                                   });


                                                                   if(sixthUser.transaction){
                                                                     const transaction = sixthUser.transaction;
                                                                     const newTran = {
                                                                       type: 'network-3',
                                                                       mode: 'credit',
                                                                       amount: '1',
                                                                       date: updated
                                                                     };
                                                                     transaction.push(newTran);
                                                                     User.updateOne({email: sixthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                       if(err){
                                                                         console.log(err);
                                                                       }
                                                                     });
                                                                   }else{
                                                                     const newTran = {
                                                                       type: 'network-3',
                                                                       mode: 'credit',
                                                                       amount: '1',
                                                                       date: updated
                                                                     };
                                                                     User.updateOne({email: sixthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                       if(err){
                                                                         console.log(err);
                                                                       }
                                                                     });
                                                                   }
                                                                 }

                                                                 //Seveth User
                                                                 User.findOne({sponID:sixthUser.sponsorID}, function(err, seventhUser){
                                                                   if(err){
                                                                     console.log(err);
                                                                   }else{
                                                                     if(seventhUser){
                                                                       if(seventhUser.status === "Active+"){
                                                                         User.updateOne({sponID: sixthUser.sponsorID},
                                                                           {$set:{earnings:{
                                                                             ab:{
                                                                               ri: seventhUser.earnings.ab.ri,
                                                                               wb: seventhUser.earnings.ab.wb,
                                                                               nw: seventhUser.earnings.ab.nw,
                                                                               ot: seventhUser.earnings.ab.ot + 1,
                                                                               oa: seventhUser.earnings.ab.oa
                                                                             },
                                                                             te: seventhUser.earnings.te + 1,
                                                                             ri: seventhUser.earnings.ri,
                                                                             wb: seventhUser.earnings.wb,
                                                                             nw: seventhUser.earnings.nw,
                                                                             ot: seventhUser.earnings.ot + 1,
                                                                             oa: seventhUser.earnings.oa
                                                                           }}},  function(err){
                                                                           if(err){
                                                                             console.log(err);
                                                                           }
                                                                         });


                                                                         if(seventhUser.transaction){
                                                                           const transaction = seventhUser.transaction;
                                                                           const newTran = {
                                                                             type: 'network-4',
                                                                             mode: 'credit',
                                                                             amount: '1',
                                                                             date: updated
                                                                           };
                                                                           transaction.push(newTran);
                                                                           User.updateOne({email: seventhUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                             if(err){
                                                                               console.log(err);
                                                                             }
                                                                           });
                                                                         }else{
                                                                           const newTran = {
                                                                             type: 'network-4',
                                                                             mode: 'credit',
                                                                             amount: '1',
                                                                             date: updated
                                                                           };
                                                                           User.updateOne({email: seventhUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                             if(err){
                                                                               console.log(err);
                                                                             }
                                                                           });
                                                                         }
                                                                       }

                                                                       //Eighth User
                                                                       User.findOne({sponID:seventhUser.sponsorID}, function(err, eighthUser){
                                                                         if(err){
                                                                           console.log(err);
                                                                         }else{
                                                                           if(eighthUser){
                                                                             if(eighthUser.status === "Active+"){
                                                                               User.updateOne({sponID: seventhUser.sponsorID},
                                                                                 {$set:{earnings:{
                                                                                   ab:{
                                                                                     ri: eighthUser.earnings.ab.ri,
                                                                                     wb: eighthUser.earnings.ab.wb,
                                                                                     nw: eighthUser.earnings.ab.nw,
                                                                                     ot: eighthUser.earnings.ab.ot + 1,
                                                                                     oa: eighthUser.earnings.ab.oa
                                                                                   },
                                                                                   te: eighthUser.earnings.te + 1,
                                                                                   ri: eighthUser.earnings.ri,
                                                                                   wb: eighthUser.earnings.wb,
                                                                                   nw: eighthUser.earnings.nw,
                                                                                   ot: eighthUser.earnings.ot + 1,
                                                                                   oa: eighthUser.earnings.oa
                                                                                 }}},  function(err){
                                                                                 if(err){
                                                                                   console.log(err);
                                                                                 }
                                                                               });


                                                                               if(eighthUser.transaction){
                                                                                 const transaction = eighthUser.transaction;
                                                                                 const newTran = {
                                                                                   type: 'network-5',
                                                                                   mode: 'credit',
                                                                                   amount: '1',
                                                                                   date: updated
                                                                                 };
                                                                                 transaction.push(newTran);
                                                                                 User.updateOne({email: eighthUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                                   if(err){
                                                                                     console.log(err);
                                                                                   }
                                                                                 });
                                                                               }else{
                                                                                 const newTran = {
                                                                                   type: 'network-5',
                                                                                   mode: 'credit',
                                                                                   amount: '1',
                                                                                   date: updated
                                                                                 };
                                                                                 User.updateOne({email: eighthUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                                   if(err){
                                                                                     console.log(err);
                                                                                   }
                                                                                 });
                                                                               }
                                                                             }

                                                                             //Nineth User
                                                                             User.findOne({sponID:eighthUser.sponsorID}, function(err, ninethUser){
                                                                               if(err){
                                                                                 console.log(err);
                                                                               }else{
                                                                                 if(ninethUser){
                                                                                   if(ninethUser.status === "Active+"){
                                                                                     User.updateOne({sponID: eighthUser.sponsorID},
                                                                                       {$set:{earnings:{
                                                                                         ab:{
                                                                                           ri: ninethUser.earnings.ab.ri,
                                                                                           wb: ninethUser.earnings.ab.wb,
                                                                                           nw: ninethUser.earnings.ab.nw,
                                                                                           ot: ninethUser.earnings.ab.ot + 1,
                                                                                           oa: ninethUser.earnings.ab.oa
                                                                                         },
                                                                                         te: ninethUser.earnings.te + 1,
                                                                                         ri: ninethUser.earnings.ri,
                                                                                         wb: ninethUser.earnings.wb,
                                                                                         nw: ninethUser.earnings.nw,
                                                                                         ot: ninethUser.earnings.ot + 1,
                                                                                         oa: ninethUser.earnings.oa
                                                                                       }}},  function(err){
                                                                                       if(err){
                                                                                         console.log(err);
                                                                                       }
                                                                                     });


                                                                                     if(ninethUser.transaction){
                                                                                       const transaction = ninethUser.transaction;
                                                                                       const newTran = {
                                                                                         type: 'network-6',
                                                                                         mode: 'credit',
                                                                                         amount: '1',
                                                                                         date: updated
                                                                                       };
                                                                                       transaction.push(newTran);
                                                                                       User.updateOne({email: ninethUser.email}, {$set:{transaction:transaction}}, function(err){
                                                                                         if(err){
                                                                                           console.log(err);
                                                                                         }
                                                                                       });
                                                                                     }else{
                                                                                       const newTran = {
                                                                                         type: 'network-6',
                                                                                         mode: 'credit',
                                                                                         amount: '1',
                                                                                         date: updated
                                                                                       };
                                                                                       User.updateOne({email: ninethUser.email}, {$set:{transaction:newTran}}, function(err){
                                                                                         if(err){
                                                                                           console.log(err);
                                                                                         }
                                                                                       });
                                                                                     }
                                                                                   }
                                                                                 }
                                                                               }
                                                                             });
                                                                           }
                                                                         }
                                                                       });
                                                                     }
                                                                   }
                                                                 });
                                                               }
                                                             }
                                                           });
                                                         }
                                                       }
                                                     });
                                                   }
                                                 }
                                               });
                                             }
                                           }
                                         });
                                       }
                                     }
                                   });
                                 }
                               }
                             });
                           }
                          }
                        })
                      }
                    });
                  }else{
                    if(req.body.section == 'crypto_withdraw'){

                        User.findOne({email: req.session.user.email}, function(err, foundUser){
                          let d = new Date();
                          let year = d.getFullYear();
                          let month = d.getMonth() + 1;
                          let date = d.getDate();
                          let hour = d.getHours() ;
                          let minutes = d.getMinutes();
                          const currentTime = hour + ":" + minutes;
                          const currentDate =  date + "/" + month + "/" + year;
                          const usrID = foundUser.userID;
                          const ri = foundUser.earnings.ab.ri;
                          const wb = foundUser.earnings.ab.wb;
                          const nw = foundUser.earnings.ab.nw;
                          const rii = foundUser.earnings.ri;
                          const amount = Number(req.body.amount);
                          const type = req.body.type;

                            if(type == 'referral'){
                              if(amount<2){
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const alert = "Amount is less than minimum withdrawal "
                                  const alertType = "warning"


                                  res.send({ "exist": true, alert:{alert, alertType}});
                                });
                              }else{
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const rii = foundUser.earnings.ri;
                                    if(ri< req.body.amount){
                                        const alert = "Low Balance, please try again."
                                        const alertType = "warning"


                                        res.send({ "exist": true, alert:{alert, alertType}});
                                      }else{

                                        User.findOne({email: req.session.user.email}, function(err, user){

                                            const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                                            const newValue = user.earnings.ab.ri - req.body.amount;
                                            const history = user.history;
                                            const newHistory = {
                                              alertType: "warning",
                                              status: "Pending",
                                              amount: req.body.amount,
                                              time: currentTime + ", " + currentDate,
                                              payment_id: random
                                            };
                                            history.push(newHistory);
                                            User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                            if(user.transaction){
                                              const transaction = user.transaction;
                                              const newTran = {
                                                type: 'referral',
                                                mode: 'debit',
                                                amount: req.body.amount,
                                                date: currentDate
                                              };
                                              transaction.push(newTran);
                                              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              const newTran = {
                                                type: 'referral',
                                                mode: 'debit',
                                                amount: req.body.amount,
                                                date: currentDate
                                              };
                                              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }
                                            if(user.status == "Active"){
                                              User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot: user.earnings.ab.ot,oa: user.earnings.ab.oa, ri: newValue, wb:user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri,oa: user.earnings.oa,ot: user.earnings.ot, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }

                                            User.updateOne({email: user.email}, {$set:{}})
                                            Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                                              if(req.body.ethereum == 'on'){
                                              const withdrawal = foundUser.withdrawals;
                                              const newWithdraw = {
                                                name: user.bankDetails.name,
                                                email: user.email,
                                                accountNumber: req.body.address,
                                                ifsc: req.body.bitcoin + req.body.litecoin,
                                                amount: req.body.amount,
                                                bankName: 'Ethereum',
                                                date: currentTime + ", " + currentDate,
                                                payment_id: random,
                                                from: type
                                              }
                                              withdrawal.push(newWithdraw);
                                              Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                              }
                                              if(req.body.bitcoin == 'on'){
                                              const withdrawal = foundUser.withdrawals;
                                              const newWithdraw = {
                                                name: user.bankDetails.name,
                                                email: user.email,
                                                accountNumber: req.body.address,
                                                ifsc: req.body.ethereum + req.body.litecoin,
                                                amount: req.body.amount,
                                                bankName: 'Bitcoin',
                                                date: currentTime + ", " + currentDate,
                                                payment_id: random,
                                                from: type
                                              }
                                              withdrawal.push(newWithdraw);
                                              Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                              }
                                              if(req.body.litecoin == 'on'){
                                              const withdrawal = foundUser.withdrawals;
                                              const newWithdraw = {
                                                name: user.bankDetails.name,
                                                email: user.email,
                                                accountNumber: req.body.address,
                                                ifsc: req.body.bitcoin + req.body.ethereum,
                                                amount: req.body.amount,
                                                bankName: "Litecoin",
                                                date: currentTime + ", " + currentDate,
                                                payment_id: random,
                                                from: type
                                              }
                                              withdrawal.push(newWithdraw);
                                              Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                              }
                                            });
                                            var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                                            fast2sms.sendMessage(options)


                                            // create reusable transporter object using the default SMTP transport
                                            const transporter = nodemailer.createTransport({
                                              host: 'smtp.gmail.com',
                                              port: 465,
                                              secure: true,
                                              auth: {
                                                user: process.env.SEND_EMAIL, // generated ethereal user
                                                pass: process.env.REAL_PASSWORD, // generated ethereal password
                                              },
                                            });

                                            // send mail with defined transport object
                                            const mailOptions ={
                                              from: process.env.SEND_EMAIL, // sender address
                                              to: process.env.WITHDRAW, // list of receivers
                                              subject: "NEW WITHDRAWAL REQUEST", // Subject line
                                              text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                                            }
                                            transporter.sendMail(mailOptions, function(err, info){
                                              if(err){
                                                console.log(err);
                                              }
                                            });

                                          const alert = "Withdrawal success"
                                          const alertType = "success"

                                          res.send({ "exist": true, alert:{alert, alertType}});
                                          });
                                    }

                                });
                              }
                            }
                            if(type == 'autobot'){
                              if(nw< amount){
                                const alert = "Low Balance, please try again."
                                const alertType = "danger"

                                res.send({ "exist": true, alert:{alert, alertType}});

                              }else{

                                  if(rii === 0){
                                    const alert = "One direct referral is required"
                                    const alertType = "danger"

                                    res.send({ "exist": true, alert:{alert, alertType}});
                                  }
                                  else{
                                    if(req.body.amount < 2){
                                      const alert = "Amount is less than minimum withdrawal "
                                      const alertType = "warning"

                                      res.send({ "exist": true, alert:{alert, alertType}});

                                    }else{
                                        User.findOne({email: req.session.user.email}, function(err, user){

                                            const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                                            const newValue = user.earnings.ab.nw - req.body.amount;
                                            const history = user.history;
                                            const newHistory = {
                                              alertType: "warning",
                                              status: "Pending",
                                              amount: req.body.amount,
                                              time: currentTime + ", " + currentDate,
                                              payment_id: random
                                            };
                                            history.push(newHistory);
                                            User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                            if(user.transaction){
                                              const transaction = user.transaction;
                                              const newTran = {
                                                type: 'autobot',
                                                mode: 'debit',
                                                amount: req.body.amount,
                                                date: currentDate
                                              };
                                              transaction.push(newTran);
                                              User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              const newTran = {
                                                type: 'autobot',
                                                mode: 'debit',
                                                amount: req.body.amount,
                                                date: currentDate
                                              };
                                              User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }
                                            if(user.status == "Active"){
                                              User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }else{
                                              User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: newValue,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                            }


                                            Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                                              if(req.body.ethereum == 'on'){
                                              const withdrawal = foundUser.withdrawals;
                                              const newWithdraw = {
                                                name: user.bankDetails.name,
                                                email: user.email,
                                                accountNumber: req.body.address,
                                                ifsc: req.body.bitcoin + req.body.litecoin,
                                                amount: req.body.amount,
                                                bankName: 'Ethereum',
                                                date: currentTime + ", " + currentDate,
                                                payment_id: random,
                                                from: type
                                              }
                                              withdrawal.push(newWithdraw);
                                              Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                              }
                                              if(req.body.bitcoin == 'on'){
                                              const withdrawal = foundUser.withdrawals;
                                              const newWithdraw = {
                                                name: user.bankDetails.name,
                                                email: user.email,
                                                accountNumber: req.body.address,
                                                ifsc: req.body.ethereum + req.body.litecoin,
                                                amount: req.body.amount,
                                                bankName: 'Bitcoin',
                                                date: currentTime + ", " + currentDate,
                                                payment_id: random,
                                                from: type
                                              }
                                              withdrawal.push(newWithdraw);
                                              Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                              }
                                              if(req.body.litecoin == 'on'){
                                              const withdrawal = foundUser.withdrawals;
                                              const newWithdraw = {
                                                name: user.bankDetails.name,
                                                email: user.email,
                                                accountNumber: req.body.address,
                                                ifsc: req.body.bitcoin + req.body.ethereum,
                                                amount: req.body.amount,
                                                bankName: "Litecoin",
                                                date: currentTime + ", " + currentDate,
                                                payment_id: random,
                                                from: type
                                              }
                                              withdrawal.push(newWithdraw);
                                              Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                                if(err){
                                                  console.log(err);
                                                }
                                              });
                                              }
                                            });
                                            var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                                            fast2sms.sendMessage(options)

                                            const transporter = nodemailer.createTransport({
                                              host: 'smtp.gmail.com',
                                              port: 465,
                                              secure: true,
                                              auth: {
                                                user: process.env.SEND_EMAIL, // generated ethereal user
                                                pass: process.env.REAL_PASSWORD, // generated ethereal password
                                              },
                                            });

                                            // send mail with defined transport object
                                            const mailOptions ={
                                              from: process.env.SEND_EMAIL, // sender address
                                              to: process.env.WITHDRAW, // list of receivers
                                              subject: "NEW WITHDRAWAL REQUEST", // Subject line
                                              text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                                            }
                                            transporter.sendMail(mailOptions, function(err, info){
                                              if(err){
                                                console.log(err);
                                              }
                                            });


                                            const alert = "Withdrawal success"
                                            const alertType = "success"

                                            res.send({ "exist": true, alert:{alert, alertType}});
                                          });
                                      }
                                    }
                              }
                            }
                            if(type == 'superUser'){
                              if(amount<2){
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const alert = "Amount is less than minimum withdrawal "
                                  const alertType = "warning"

                                  res.send({ "exist": true, alert:{alert, alertType}});
                                });
                              }else{
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;

                                  if(wb< req.body.amount){
                                    const alert = "Low Balance, please try again."
                                    const alertType = "warning"

                                    res.send({ "exist": true, alert:{alert, alertType}});
                                  }else{
                                    User.findOne({email: req.session.user.email}, function(err, user){

                                        const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                                        const newValue = user.earnings.ab.wb - req.body.amount;
                                        const history = user.history;
                                        const newHistory = {
                                          alertType: "warning",
                                          status: "Pending",
                                          amount: req.body.amount,
                                          time: currentTime + ", " + currentDate,
                                          payment_id: random
                                        };
                                        history.push(newHistory);
                                        User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });

                                        if(user.transaction){
                                          const transaction = user.transaction;
                                          const newTran = {
                                            type: 'level',
                                            mode: 'debit',
                                            amount: req.body.amount,
                                            date: currentDate
                                          };
                                          transaction.push(newTran);
                                          User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                        }else{
                                          const newTran = {
                                            type: 'level',
                                            mode: 'debit',
                                            amount: req.body.amount,
                                            date: currentDate
                                          };
                                          User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                        }
                                        if(user.status == "Active"){
                                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                        }else{
                                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw,ot:user.earnings.ab.ot,oa:user.earnings.ab.oa, ri: user.earnings.ab.ri, wb: newValue}, te: user.earnings.te, ri: user.earnings.ri,ot:user.earnings.ot,oa:user.earnings.oa, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                        }

                                        User.updateOne({email: user.email}, {$set:{}})
                                        Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                                          if(req.body.ethereum == 'on'){
                                          const withdrawal = foundUser.withdrawals;
                                          const newWithdraw = {
                                            name: user.bankDetails.name,
                                            email: user.email,
                                            accountNumber: req.body.address,
                                            ifsc: req.body.bitcoin + req.body.litecoin,
                                            amount: req.body.amount,
                                            bankName: 'Ethereum',
                                            date: currentTime + ", " + currentDate,
                                            payment_id: random,
                                            from: type
                                          }
                                          withdrawal.push(newWithdraw);
                                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                          }
                                          if(req.body.bitcoin == 'on'){
                                          const withdrawal = foundUser.withdrawals;
                                          const newWithdraw = {
                                            name: user.bankDetails.name,
                                            email: user.email,
                                            accountNumber: req.body.address,
                                            ifsc: req.body.ethereum + req.body.litecoin,
                                            amount: req.body.amount,
                                            bankName: 'Bitcoin',
                                            date: currentTime + ", " + currentDate,
                                            payment_id: random,
                                            from: type
                                          }
                                          withdrawal.push(newWithdraw);
                                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                          }
                                          if(req.body.litecoin == 'on'){
                                          const withdrawal = foundUser.withdrawals;
                                          const newWithdraw = {
                                            name: user.bankDetails.name,
                                            email: user.email,
                                            accountNumber: req.body.address,
                                            ifsc: req.body.bitcoin + req.body.ethereum,
                                            amount: req.body.amount,
                                            bankName: "Litecoin",
                                            date: currentTime + ", " + currentDate,
                                            payment_id: random,
                                            from: type
                                          }
                                          withdrawal.push(newWithdraw);
                                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                          }
                                        });
                                        var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                                        fast2sms.sendMessage(options)

                                        const transporter = nodemailer.createTransport({
                                          host: 'smtp.gmail.com',
                                          port: 465,
                                          secure: true,
                                          auth: {
                                            user: process.env.SEND_EMAIL, // generated ethereal user
                                            pass: process.env.REAL_PASSWORD, // generated ethereal password
                                          },
                                        });

                                        // send mail with defined transport object
                                        const mailOptions ={
                                          from: process.env.SEND_EMAIL, // sender address
                                          to: process.env.WITHDRAW, // list of receivers
                                          subject: "NEW WITHDRAWAL REQUEST", // Subject line
                                          text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                                        }
                                        transporter.sendMail(mailOptions, function(err, info){
                                          if(err){
                                            console.log(err);
                                          }
                                        });


                                        const alert = "Withdrawal success"
                                        const alertType = "success"

                                        res.send({ "exist": true, alert:{alert, alertType}});
                                      });
                                  }
                                });
                              }
                            }
                            if(type == 'trial'){
                              if(amount<2){
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const alert = "Amount is less than minimum withdrawal "
                                  const alertType = "warning"

                                  res.send({ "exist": true, alert:{alert, alertType}});
                                });
                              }else{
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const ot = foundUser.earnings.ab.ot;
                                  const oa = foundUser.earnings.ab.oa;

                                  if(ot< req.body.amount){
                                    const alert = "Low Balance, please try again."
                                    const alertType = "warning"

                                    res.send({ "exist": true, alert:{alert, alertType}});
                                  }else{
                                      User.findOne({email: req.session.user.email}, function(err, user){

                                          const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                                          const newValue = user.earnings.ab.ot - req.body.amount;
                                          const history = user.history;
                                          const newHistory = {
                                            alertType: "warning",
                                            status: "Pending",
                                            amount: req.body.amount,
                                            time: currentTime + ", " + currentDate,
                                            payment_id: random
                                          };
                                          history.push(newHistory);
                                          User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });

                                          if(user.transaction){
                                            const transaction = user.transaction;
                                            const newTran = {
                                              type: 'trial',
                                              mode: 'debit',
                                              amount: req.body.amount,
                                              date: currentDate
                                            };
                                            transaction.push(newTran);
                                            User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                          }else{
                                            const newTran = {
                                              type: 'trial',
                                              mode: 'debit',
                                              amount: req.body.amount,
                                              date: currentDate
                                            };
                                            User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                          }
                                          User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:newValue,oa:user.earnings.ab.oa}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });


                                          User.updateOne({email: user.email}, {$set:{}})
                                          Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                                            if(req.body.ethereum == 'on'){
                                            const withdrawal = foundUser.withdrawals;
                                            const newWithdraw = {
                                              name: user.bankDetails.name,
                                              email: user.email,
                                              accountNumber: req.body.address,
                                              ifsc: req.body.bitcoin + req.body.litecoin,
                                              amount: req.body.amount,
                                              bankName: 'Ethereum',
                                              date: currentTime + ", " + currentDate,
                                              payment_id: random,
                                              from: type
                                            }
                                            withdrawal.push(newWithdraw);
                                            Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                            }
                                            if(req.body.bitcoin == 'on'){
                                            const withdrawal = foundUser.withdrawals;
                                            const newWithdraw = {
                                              name: user.bankDetails.name,
                                              email: user.email,
                                              accountNumber: req.body.address,
                                              ifsc: req.body.ethereum + req.body.litecoin,
                                              amount: req.body.amount,
                                              bankName: 'Bitcoin',
                                              date: currentTime + ", " + currentDate,
                                              payment_id: random,
                                              from: type
                                            }
                                            withdrawal.push(newWithdraw);
                                            Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                            }
                                            if(req.body.litecoin == 'on'){
                                            const withdrawal = foundUser.withdrawals;
                                            const newWithdraw = {
                                              name: user.bankDetails.name,
                                              email: user.email,
                                              accountNumber: req.body.address,
                                              ifsc: req.body.bitcoin + req.body.ethereum,
                                              amount: req.body.amount,
                                              bankName: "Litecoin",
                                              date: currentTime + ", " + currentDate,
                                              payment_id: random,
                                              from: type
                                            }
                                            withdrawal.push(newWithdraw);
                                            Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                              if(err){
                                                console.log(err);
                                              }
                                            });
                                            }
                                          });
                                          var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                                          fast2sms.sendMessage(options)

                                          const transporter = nodemailer.createTransport({
                                            host: 'smtp.gmail.com',
                                            port: 465,
                                            secure: true,
                                            auth: {
                                              user: process.env.SEND_EMAIL, // generated ethereal user
                                              pass: process.env.REAL_PASSWORD, // generated ethereal password
                                            },
                                          });

                                          // send mail with defined transport object
                                          const mailOptions ={
                                            from: process.env.SEND_EMAIL, // sender address
                                            to: process.env.WITHDRAW, // list of receivers
                                            subject: "NEW WITHDRAWAL REQUEST", // Subject line
                                            text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                                          }
                                          transporter.sendMail(mailOptions, function(err, info){
                                            if(err){
                                              console.log(err);
                                            }
                                          });

                                          const alert = "Withdrawal success"
                                          const alertType = "success"

                                          res.send({ "exist": true, alert:{alert, alertType}});
                                        });
                                  }
                                });
                              }

                            }
                            if(type == 'arc'){
                              if(amount<2){
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const alert = "Amount is less than minimum withdrawal "
                                  const alertType = "warning"

                                  res.send({ "exist": true, alert:{alert, alertType}});
                                });
                              }else{
                                User.findOne({email: req.session.user.email}, function(err, foundUser){
                                  const usrID = foundUser.userID;
                                  const ri = foundUser.earnings.ab.ri;
                                  const wb = foundUser.earnings.ab.wb;
                                  const nw = foundUser.earnings.ab.nw;
                                  const ot = foundUser.earnings.ab.ot;
                                  const oa = foundUser.earnings.ab.oa;

                                  if(oa< req.body.amount){
                                    const alert = "Low Balance, please try again."
                                    const alertType = "warning"

                                    res.send({ "exist": true, alert:{alert, alertType}});
                                  }else{
                                    User.findOne({email: req.session.user.email}, function(err, user){

                                        const random = "CR3" + String(Math.floor(Math.random()*999999999999));
                                        const newValue = user.earnings.ab.oa - req.body.amount;
                                        const history = user.history;
                                        const newHistory = {
                                          alertType: "warning",
                                          status: "Pending",
                                          amount: req.body.amount,
                                          time: currentTime + ", " + currentDate,
                                          payment_id: random,
                                          from: type
                                        };
                                        history.push(newHistory);
                                        User.updateOne({email: user.email}, {$set:{history:history}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });

                                        if(user.transaction){
                                          const transaction = user.transaction;
                                          const newTran = {
                                            type: 'arc',
                                            mode: 'debit',
                                            amount: req.body.amount,
                                            date: currentDate
                                          };
                                          transaction.push(newTran);
                                          User.updateOne({email: user.email}, {$set:{transaction:transaction}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                        }else{
                                          const newTran = {
                                            type: 'arc',
                                            mode: 'debit',
                                            amount: req.body.amount,
                                            date: currentDate
                                          };
                                          User.updateOne({email: user.email}, {$set:{transaction:newTran}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                        }
                                        User.updateOne({email: user.email}, {$set:{earnings:{ab:{nw: user.earnings.ab.nw, ri: user.earnings.ab.ri, wb: user.earnings.ab.wb,ot:user.earnings.ab.ot,oa:newValue}, te: user.earnings.te,ot:user.earnings.ot,oa:user.earnings.oa, ri: user.earnings.ri, nw: user.earnings.nw, wb: user.earnings.wb}}}, function(err){
                                          if(err){
                                            console.log(err);
                                          }
                                        });


                                        User.updateOne({email: user.email}, {$set:{}})
                                        Admin.findOne({email: process.env.EMAIL}, function(err, foundUser){
                                          if(req.body.ethereum == 'on'){
                                          const withdrawal = foundUser.withdrawals;
                                          const newWithdraw = {
                                            name: user.bankDetails.name,
                                            email: user.email,
                                            accountNumber: req.body.address,
                                            ifsc: req.body.bitcoin + req.body.litecoin,
                                            amount: req.body.amount,
                                            bankName: 'Ethereum',
                                            date: currentTime + ", " + currentDate,
                                            payment_id: random,
                                            from: type
                                          }
                                          withdrawal.push(newWithdraw);
                                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                          }
                                          if(req.body.bitcoin == 'on'){
                                          const withdrawal = foundUser.withdrawals;
                                          const newWithdraw = {
                                            name: user.bankDetails.name,
                                            email: user.email,
                                            accountNumber: req.body.address,
                                            ifsc: req.body.ethereum + req.body.litecoin,
                                            amount: req.body.amount,
                                            bankName: 'Bitcoin',
                                            date: currentTime + ", " + currentDate,
                                            payment_id: random,
                                            from: type
                                          }
                                          withdrawal.push(newWithdraw);
                                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                          }
                                          if(req.body.litecoin == 'on'){
                                          const withdrawal = foundUser.withdrawals;
                                          const newWithdraw = {
                                            name: user.bankDetails.name,
                                            email: user.email,
                                            accountNumber: req.body.address,
                                            ifsc: req.body.bitcoin + req.body.ethereum,
                                            amount: req.body.amount,
                                            bankName: "Litecoin",
                                            date: currentTime + ", " + currentDate,
                                            payment_id: random,
                                            from: type
                                          }
                                          withdrawal.push(newWithdraw);
                                          Admin.updateOne({email: process.env.EMAIL}, {$set:{withdrawals:withdrawal}}, function(err){
                                            if(err){
                                              console.log(err);
                                            }
                                          });
                                          }
                                        });
                                        var options = {authorization : process.env.YOUR_API_KEY , message : 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",  numbers : ['7676748605','9626930260']}
                                        fast2sms.sendMessage(options)

                                        const transporter = nodemailer.createTransport({
                                          host: 'smtp.gmail.com',
                                          port: 465,
                                          secure: true,
                                          auth: {
                                            user: process.env.SEND_EMAIL, // generated ethereal user
                                            pass: process.env.REAL_PASSWORD, // generated ethereal password
                                          },
                                        });

                                        // send mail with defined transport object
                                        const mailOptions ={
                                          from: process.env.SEND_EMAIL, // sender address
                                          to: process.env.WITHDRAW, // list of receivers
                                          subject: "NEW WITHDRAWAL REQUEST", // Subject line
                                          text: 'NEW WITHDRAWAL REQUEST, Withdrawal from ' + req.session.user.email + ' and the amount is ' + req.body.amount + '$ which is ' + req.body.amount*80 + "rs",
                                        }
                                        transporter.sendMail(mailOptions, function(err, info){
                                          if(err){
                                            console.log(err);
                                          }
                                        });


                                        const alert = "Withdrawal success"
                                        const alertType = "success"

                                        res.send({ "exist": true, alert:{alert, alertType}});
                                      });
                                  }
                                });
                              }

                            }


                        });
                    }
                  }
                }
              }else{
                res.send({
                    "valid": speakeasy.totp.verify({
                        secret: foundUser.secret,
                        encoding: "base32",
                        token: req.body.token,
                        window: 0
                    })
                });
              }
            }
          }
        }
      });
  }
});








app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000");
});
