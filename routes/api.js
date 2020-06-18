const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Product = require('../models/Product');
const Review = require('../models/Review');
const app = express();
const mongoose = require("mongoose");
const multer = require('multer');
const bodyParser = require('body-parser');
const Categories = require('../models/Categories');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require("nodemailer");
//const passport = require("passport");
const Token = require('../models/Token');
require('dotenv').config();
app.use(bodyParser.json());

//image id date fix
const imageId = new Date().toISOString().replace(/:/g, '-');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/');
    },
    // filename: function(req,file,cb){
    //     cb(null, new Date().toISOString().replace(/:/g, '-') +'-'+ file.originalname);
    // }
    filename: function (req, file, cb) {
        //cb(null, Date.now() + file.originalname);
        cb(null, imageId + '-' + file.originalname);
    }
});


const upload = multer({storage: storage});

const Items = require('../models/Items');

const Products = require('../models/Product');

router.get('/users', function (req, res) {


    res.send({type: 'GET'});
});


router.post('/signup',function(req,res,next){

  console.log(req.body);

    User.findOne({ email: req.body.email}). then(user =>{
      if(user) {
        res.send(JSON.stringify({errors:"User with email already exists" , code : 'reg_error'} ));
      } else {
       
        //encrypt password before saving in database
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) throw err;
            req.body.password = hash;
            
            User.create(req.body).then(function(user){
              
  
          //  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
          //  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
          //  res.header("Access-Control-Allow-Methods" , "POST, GET, OPTIONS");
              
  
          //  res.setHeader('Content-Type', 'application/json');
           // res.status(200).send(JSON.stringify({success:"A verification email has been sent to your email account" , code : 'reg', user : user} ));
            
            //new verification token is created for the new user
                  var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
                  
                  //save the verification token
                  token.save(function (err) {
                    if (err) {
                      return res.status(500).send({ msg: err.message }); 
                    }
                   
  
                    //send the email
                    var transporter = nodemailer.createTransport({ service: 'gmail', port: 25, secure: false , auth: { user: process.env.EMAIL, pass: process.env.PASSWORD}, tls: { rejectUnauthorized: false } });                                          
                    var mailOptions = { from: process.env.EMAIL , to: user.email, subject: 'Account Verification Token', text: 'Hello, \n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/api\/confirmation\/' + token.token + '\/' +  user.email + '\n' }; 
                    transporter.sendMail(mailOptions, function (err) {
                      if (err) { return res.status(500).send({ msg: err.message }); }
                      res.status(200).send(JSON.stringify({success:"A verification email has been sent to " + user.email , code : 'reg', user : user} ));
                    });
                  });
          })
        })
  
              
      }).catch(function (err){
        res.json(err);
      });
    }
  });
  
  });
  
  
  
router.post('/login',function(req,res,next){
    
      User.findOne({ email: req.body.email}, function(err, user) {

     
          if(user === null)
          {
             //res.send("User doesn't Exists");
             //res.status(401).send(JSON.stringify({message:"User does not exist" , isValidLogin: true, } ));
             res.send(JSON.stringify({message: "User does not exist",isValidLogin: false}));
          }
  
          else if (user.email === req.body.email ){
  
            bcrypt.compare(req.body.password, user.password).then(isMatch => {
              if(isMatch) {
                //User matched
                //res.status(401).send(JSON.stringify({message:"login successfully" , code : 'login', user : user} ));
                // Create JWT Payload
                const payload = {
                  id: user._id,
                  name: user.email,
                  role: user.role,
                };
  

  
                // Sign token
                jwt.sign(
                  payload,
                  "secret",
                  {
                    expiresIn: 86400 // 1 day
                  },
                  (err, token) => {
                    // res.json({
                    //   isValidLogin: true,
                    //   token: "Bearer " + token,
                    //   token1 : token
                    // });
                    res.send(JSON.stringify({message: "User find",isValidLogin: true,token : token}));
                  }
                );
  
  
              } 
              
              
              else{
               // res.status(400).send(JSON.stringify({message:"Invalid Password" , isValidLogin: false} ));
                res.send(JSON.stringify({message: "Invalid Password",  isValidLogin: false}));
              }
            })
              
          }
  
      });
    
    });
  
  
   
router.get('/confirmation/:token/:email', function (req, res, next){
    
    Token.findOne({ token: req.params.token }, function (err, token) {
      if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });
  
      // If we found a token, find a matching user
      User.findOne({ _id: token._userId, email: req.params.email }, function (err, user) {
          if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
          if (user.isVerified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });
  
          // Verify and save the user
          user.isVerified = true;
          //redirect to login page
          //var response = Response.redirect("http://localhost:3000/login", status);
          user.save(function (err) {
              if (err) { return res.status(500).send({ msg: err.message }); }
              //res.status(200).send("The account has been verified. Please log in.");
              res.status(200).redirect("http://localhost:3000/login");

          });
      });
  });
  });

//route for managerLogin
  router.post('/managerLogin',function(req,res,next){
    
    console.log('req body',req.body);
    User.findOne({ email: req.body.email}, function(err, user) {

      console.log('user',user);
   
        if(user === null)
        {
           //res.send("User doesn't Exists");
           //res.status(401).send(JSON.stringify({message:"User does not exist" , isValidLogin: true, } ));
           res.send(JSON.stringify({message: "Manager does not exist",isValidLogin: false}));
        }

        else if (user.email === req.body.email ){

          bcrypt.compare(req.body.password, user.password).then(isMatch => {
            if(isMatch) {
              //User matched
              //res.status(401).send(JSON.stringify({message:"login successfully" , code : 'login', user : user} ));
              // Create JWT Payload
              const payload = {
                id: user._id,
                name: user.email,
                role: user.role,
              };



              // Sign token
              jwt.sign(
                payload,
                "secret",
                {
                  expiresIn: 86400 // 1 day
                },
                (err, token) => {
                  // res.json({
                  //   isValidLogin: true,
                  //   token: "Bearer " + token,
                  //   token1 : token
                  // });
                  res.send(JSON.stringify({message: "Manager found", isValidLogin: true, token : token}));
                }
              );


            } 
            
            
            else{
             // res.status(400).send(JSON.stringify({message:"Invalid Password" , isValidLogin: false} ));
              res.send(JSON.stringify({message: "Invalid Password",  isValidLogin: false}));
            }
          })
            
        }

    });
  
  });

//route for adminLogin
router.post('/adminLogin',function(req,res,next){
    
  User.findOne({ email: req.body.email}, function(err, user) {

 
      if(user === null)
      {
         //res.send("User doesn't Exists");
         //res.status(401).send(JSON.stringify({message:"User does not exist" , isValidLogin: true, } ));
         res.send(JSON.stringify({message: "Admin does not exist",isValidLogin: false}));
      }

      else if (user.email === req.body.email ){

        bcrypt.compare(req.body.password, user.password).then(isMatch => {
          if(isMatch) {
            //User matched
            //res.status(401).send(JSON.stringify({message:"login successfully" , code : 'login', user : user} ));
            // Create JWT Payload
            const payload = {
              id: user._id,
              name: user.email,
              role: user.role,
            };



            // Sign token
            jwt.sign(
              payload,
              "secret",
              {
                expiresIn: 86400 // 1 day
              },
              (err, token) => {
                // res.json({
                //   isValidLogin: true,
                //   token: "Bearer " + token,
                //   token1 : token
                // });
                res.send(JSON.stringify({message: "Admin found", isValidLogin: true, token : token}));
              }
            );


          } 
          
          
          else{
           // res.status(400).send(JSON.stringify({message:"Invalid Password" , isValidLogin: false} ));
            res.send(JSON.stringify({message: "Invalid Password",  isValidLogin: false}));
          }
        })
          
      }

  });

});


router.get('/allitems', async (req, res, next) => {
    try {

        const item = await Products.find();
        res.send(JSON.stringify({message: "item details", item: item}));


    } catch (e) {

        next(e)
    }
});//5ebba697274b830ec4515452

router.post("/UpdateImages/:id", upload.single('productImage'), async (req, res) => {   // add a items for wishlist

    try {


        const itemAdd = {productImage: req.file.filename}
        //const image = req.file.filename;

        //console.log('itemAdd',itemAdd);
        // const productImage = req.file.filename;

        const response = await Products.findOneAndUpdate({_id: req.params.id}, {$push: {images: itemAdd}}, {new: true});

        res.send(JSON.stringify({message: "add image ", res: response}));

    } catch (e) {
        console.log(e);
    }

});

router.post("/addRatingWithComment/:id", async (req, res) => {   // add a rating with comment to given product


    try {

        const item = await Products.findOneAndUpdate({_id: req.params.id}, {$push: {ratings: req.body}}, {new: true});

        res.send(JSON.stringify({message: "rating added successfully", item: item}));


    } catch (e) {
        console.log(e);
    }

});

router.get("/getRatingsWithComments/:id", async (req, res, next) => {  // get ratings for given product id

    try {

        const item = await Products.findOne({_id: req.params.id});

        let sum = 0;

        let noOfRatings = 0;

        let a = 0, b = 0, c = 0, d = 0, e = 0;

        for (let ratings of item.ratings) {
        }


        for (let value of item.ratings) {
            if (value.rate === 1) {
                a++;
            }
            if (value.rate === 2) {
                b++;
            }
            if (value.rate === 3) {
                c++;
            }
            if (value.rate === 4) {
                d++;
            }
            if (value.rate === 5) {
                e++;
            }

            noOfRatings++;

            sum = sum + value.rate;
        }

        const avgs = sum / item.ratings.length;
        let avg = avgs.toFixed(2);
        if(isNaN(avg)){
          avg = 0;
        }
        console.log(avg);


        res.send(JSON.stringify({
            message: "item details",
            countRatings: {noOfRatings},
            ratings: item.ratings,
            avg: {avg},
            item: item,
            noOfRatings: {one: a, two: b, three: c, four: d, five: e}
        }));
    } catch (e) {
        next(e)
    }


});


router.get('/items/:id', async (req, res, next) => {
    try {

        const item = await Products.findOne({_id: req.params.id});


        res.send(JSON.stringify({message: "item details", item: item}));
      } catch (e) {
        
        next(e)
    }
});

    router.post("/checkUserIsRated/:id", async (req, res) =>{   // add a rating with comment to given product
    

      try{
    

        const user = req.body.username;
    
        const item = await Products.findOne({_id : req.params.id});
    

    
        //5ebcf2228739513778b72153
        let isRated = false;
        let userIS = null;
    
        for(let rating of item.ratings)
        {
         // console.log(rating.userName);
          if(rating.userName == user)
          {
           // console.log('found user');
            //console.log('rating',rating);
            isRated = true;
            userIS = rating;
          }
          
        }
    
        if(isRated)
        {
          res.send(JSON.stringify({message:"user rated" ,rated:true ,rating:userIS  } ));
        }
        else
        {
          res.send(JSON.stringify({message:"user not rated",rated:false } ));
        }
    
        
        
        //res.send(JSON.stringify({message:"rating added successfully" , item : item } ));
    
    
      }catch(e)
      {
        console.log(e);
      }
    
    });
    
    
    
router.put('/updateRating/:id', async (req, res, next) => {
          try {
    
           //
              // console.log("id",req.params.id);
    
        const response =   await  Products.updateOne(
              {
                "_id" : req.body.productId,
                "ratings._id" : req.params.id
              },
              {
                "$set" :
                {
                    "ratings.$.rate": req.body.rate,
                    "ratings.$.comment": req.body.comment,
    
                }
              }
            );
          
            res.send(JSON.stringify({message:"rate updated" , item : response } ));
    
            
          } catch (e) {
            
            next(e) 
          }
        });
    
router.delete('/deleteRating/:id', async (req, res, next) => {
          try {
    
        const response =   await  Products.updateOne(
          { _id: req.body.productId },
          { $pull: { 'ratings': { _id: req.params.id } } }
            );
          
            res.send(JSON.stringify({message:"rate deleted" , item : response } ));
    
            
          } catch (e) {
            
            next(e) 
          }
        });
    



router.post("/addItemToWishList/:id", async (req, res) => {   // add a items for wishlist

    try {

        const item = await Products.findOne({_id: req.params.id}); // find the item


        const itemAdd = {itemID : item._id,itemName: item.name,mainCategory :item.mainCategory, price: item.price,
            image : item.images[0].productImage}


        const user = await User.findOne({_id: req.body.userId});

      //  console.log('user wishlist',user);

        const list = await user.wishlist;

       // console.log('user list',list);

        var exists = false;

        for (let x of list) {
            //console.log('x',x.itemID)
            if (x.itemID == item._id) {
                exists = true;
            }
        }

        if (exists) {
            res.send(JSON.stringify({message: "alreadyy exists",exists:true}));
        } else {

            const response = await User.findOneAndUpdate({_id: req.body.userId}, {$push: {wishlist: itemAdd}}, {new: true});
            // const response = await User.findOneAndUpdate({ userName: 'hasitha' }, {$push: {wishlist: itemAdd}}, { new: true });
            res.send(JSON.stringify({message: "add item successfully to wishlist", wishlist: response.wishlist,exists:false}));

        }


    } catch (e) {
        console.log(e);
    }

});



router.post("/addItemWishListFromCart/:id", async (req, res) => {   // add a items for wishlist

    try {
        const itemAdd = req.body;
        const response = await User.findOneAndUpdate({_id: req.params.id}, {$push: {cart: itemAdd}}, {new: true});
        res.send(JSON.stringify({message: "add item successfully to cart", wishlist: response.cart}));

    } catch (e) {
        console.log(e);
    }
});

router.get('/getWishList/:id', async (req, res, next) => {  // get user wishlist
    try {
        const response = await User.findOne({_id: req.params.id});
        let total=0;
        for (let item of response.wishlist) {
            total = total + item.price;
        }
        res.send(JSON.stringify({message: "wishlist details", wishlist: response.wishlist,total:total}));
    } catch (e) {

        next(e)
    }
});

router.post('/deleteWishListProduct', async (req, res, next) => { // delete item from wishlist
    try {
        const response = await User.findOne({_id: req.body.userId});
        const responses = await User.updateOne({_id: req.body.userId}, {'$pull': {'wishlist': {'_id': req.body.wishListOredrId}}}, {multi: true});
        res.send(JSON.stringify({message: "deleted successfully", wishlist: responses}));
    } catch (e) {

        next(e)
    }
});


router.post('/addCategories',async (req,res)=>{
    const category = req.body.category;
    let subCategory = req.body.subCategory;
    Categories.updateOne(
        {$addToSet: { [category] : [subCategory] } },
        function(err, result) {
            if(err) {
                res.send(err);
            } else{
                res.send(result);
            }
        }
    )
})
router.get('/getCategoriesToNav',async (req,res)=>{

    try {
        const category = await Categories.find();
        await res.json(category);

    }catch (e) {
        console.log(e)
    }

});


router.post("/items", upload.array('productImage', 4) , (req, res) => {   // add an item

  let productImage = "";
  /*for (var i = 0; i < req.files.length; i++) {
    const url = req.files[i].originalname
    const fileName = new Date().toISOString().replace(/:/g, '-') + '-' + url;
    console.log(fileName)
    productImage.push(fileName)
  }*/
  const url = req.files[0].originalname
    const fileName = imageId + '-' + url;
    console.log(fileName)
    productImage = fileName
  //const size = req.body.size;
  //const qty = req.body.color;
  //const url = req.protocol + '://' + req.get('host') + '/'
  const product = {
    itemID : req.body.itemId,
    name : req.body.title,
    description: req.body.description,
    mainCategory: req.body.category,
    subCategory: req.body.subCategory,
    price: req.body.price,
    discount: req.body.discount,
    quantity:{
      sQuantity :{
        red : req.body.sRed,
        black : req.body.sBlack,
        white : req.body.sWhite,
        green : req.body.sGreen,
        pink : req.body.sPink,
        blue : req.body.sBlue,
        multi : req.body.sMulti,
      },
      mQuantity:{
        red : req.body.mRed,
        black : req.body.mBlack,
        white : req.body.mWhite,
        green : req.body.mGreen,
        pink : req.body.mPink,
        blue : req.body.mBlue,
        multi : req.body.mMulti,
      },
      lQuantity:{
        red : req.body.lRed,
        black : req.body.lBlack,
        white : req.body.lWhite,
        green : req.body.lGreen,
        pink : req.body.lPink,
        blue : req.body.lBlue,
        multi : req.body.lMulti,
      },
      xlQuantity:{
        red : req.body.xlRed,
        black : req.body.xlBlack,
        white : req.body.xlWhite,
        green : req.body.xlGreen,
        pink : req.body.xlPink,
        blue : req.body.xlBlue,
        multi : req.body.xlMulti,
      }
  },
  images :[
    {
     productImage : productImage
    }
   
   ],
  }
    Product.create(product)
    .then(function(products) {
      
      res.status(200).send(JSON.stringify({success:"Item has been addedd successfully" , code : 'item', user : products} ));

    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });

  
});

router.post('/signupManager',function(req,res,next){
  
  console.log(req.body);

  User.findOne({ email: req.body.email}). then(manager => {
    if(manager) {
      res.send({message:"User with email already exists", code: "error"} );
    } else {

      const managerData = {
        firstName : req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        password: req.body.password,
        role: "Manager",
      }         
      
      User.create(managerData).then(function(manager){

     // res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
    //  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //  res.header("Access-Control-Allow-Methods" , "POST, GET, OPTIONS");
        

     // res.setHeader('Content-Type', 'application/json');
      //res.status(200).send(JSON.stringify({success:"registerd successfully" , code : 'reg', user : user} ));
      
      //new verification token is created for the new user
            var token = new Token({ _userId: manager._id, token: crypto.randomBytes(16).toString('hex') });
            
            //save the verification token
            token.save(function (err) {
              if (err) {
                return res.status(500).send({ msg: err.message }); 
              }

              //send the email
              var transporter = nodemailer.createTransport({ service: 'gmail', port: 25, secure: false , auth: { user:  process.env.EMAIL, pass:  process.env.PASSWORD }, tls: { rejectUnauthorized: false } });                                          
              var mailOptions = { from:  process.env.EMAIL, 
                                  to: manager.email, 
                                  subject: 'Manager Account Verification', 
                                  text: 'Hello, \n\n' + 
                                  'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/api\/confirmation\/' + token.token + '\/' +  manager.email + '\n' +
                                  'Password: ' + manager.password + '/n' + 'Use the above password to login with your email address. We reccomend changing the password after login.' }; 
              transporter.sendMail(mailOptions, function (err) {
                if (err) { return res.status(500).send({ msg: err.message }); }
                res.status(200).send({message: 'A verification email has been sent to ' + manager.email + '.', code: "success"});
              });
            });
    }).catch(function (err){
      res.json(err);
    });
  }
});
});


router.get('/getProductToAddDiscount/:productId',async (req,res)=>{
    try{
        const product=  await Products.findOne({$or:[{"itemID": req.params.productId}]});
        await res.json(product)
    }catch (e) {
        console.log(e)
    }

})

router.patch('/updateProductDiscount/:_id',async (req,res)=>{
    try{
        const updatedProduct =  await Products.updateOne(
            {_id:req.params._id},
            {$set:{discount:req.body.discount}});

        await res.json(updatedProduct);

    }catch (e) {
        console.log(e);

    }
})

router.post('/addItemToCart/:id',async (req,res)=>{

    const product = new Products({
        id : req.body.itemID,
        itemName: req.body.itemName,
        discount: req.body.discount,
        color : req.body.selectedColor,
        size : req.body.selectedSize,
        images : []
    })


    try {

        const response = await User.update(
            {"_id" : req.params.id},
            {
                $push:{
                    cart:req.body.data
                }
            })

    }catch (e) {
        console.log(e)
    }
})

router.get('/getCart/:id',async (req,res)=>{
    try {
        const response = await User.find({_id:req.params.id});
        return res.json(response);
    }catch (e) {
        console.log(e)
    }

})
/*router.get('/getCart/:id',async (req,res)=>{

    const response = await User.findOne({_id: req.params.id});
    return res.json(response);

})*/

router.patch('/deleteCart/:id',async (req,res)=>{

    try {
        const response = await User.update({_id:req.params.id},{
            $pull : {'cart':{uuid:req.body.uuid}}
        })
        return res.json(response.data);
    }catch (e) {
        console.log(e)
    }

});



router.post('/SMReg',function(req,res,next){

  console.log(req.body);

    User.findOne({ email: req.body.email}). then(user =>{
      if(user) {
        res.send(JSON.stringify({errors:"User with email already exists" , code : 'reg_error'} ));
      } else {
       
        //encrypt password before saving in database
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(req.body.password, salt, (err, hash) => {
            if (err) throw err;
            req.body.password = hash;

            const managerData = {
              firstName : req.body.firstName,
              lastName: req.body.lastName,
              email: req.body.email,
              password: req.body.password,
              role: "Manager",
            }  
            
            User.create(managerData).then(function(user){
              
  
          //  res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
           // res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
          //  res.header("Access-Control-Allow-Methods" , "POST, GET, OPTIONS");
              
  
           // res.setHeader('Content-Type', 'application/json');
           // res.status(200).send(JSON.stringify({success:"A verification email has been sent to your email account" , code : 'reg', user : user} ));
            
            //new verification token is created for the new user
                  var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
                  
                  //save the verification token
                  token.save(function (err) {
                    if (err) {
                      return res.status(500).send({ msg: err.message }); 
                    }
  
                    //send the email
                    var transporter = nodemailer.createTransport({ service: 'gmail', port: 25, secure: false , auth: { user: process.env.EMAIL, pass: process.env.PASSWORD }, tls: { rejectUnauthorized: false } });                                          
                    var mailOptions = { from: process.env.EMAIL, to: user.email, subject: 'Account Verification Token', text: 'Hello, \n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/api\/confirmation\/' + token.token + '\/' +  user.email + '\n' }; 
                    transporter.sendMail(mailOptions, function (err) {
                      if (err) { return res.status(500).send({ msg: err.message }); }
                      res.status(200).send(JSON.stringify({success:"A verification email has been sent to " + user.email , code : 'reg', user : user} ));
                    });
                  });
          })
        })
  
              
      }).catch(function (err){
        res.json(err);
      });
    }
  });
  
  });


  router.post('/AdminReg',function(req,res,next){

    console.log(req.body);
  
      User.findOne({ email: req.body.email}). then(user =>{
        if(user) {
          res.send(JSON.stringify({errors:"User with email already exists" , code : 'reg_error'} ));
        } else {
         
          //encrypt password before saving in database
          bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(req.body.password, salt, (err, hash) => {
              if (err) throw err;
              req.body.password = hash;
  
              const AdminData = {
                firstName : req.body.firstName,
                lastName: req.body.lastName,
                email: req.body.email,
                password: req.body.password,
                role: "Admin",
              }  
              
              User.create(AdminData).then(function(user){
                
    
             // res.header("Access-Control-Allow-Origin", "http://localhost:3000"); // update to match the domain you will make the request from
            //  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
            //  res.header("Access-Control-Allow-Methods" , "POST, GET, OPTIONS");
                
    
             //  res.setHeader('Content-Type', 'application/json');
              res.status(200).send(JSON.stringify({success:"A verification email has been sent to your email account" , code : 'reg', user : user} ));
              
              //new verification token is created for the new user
                    var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });
                    
                    //save the verification token
                    token.save(function (err) {
                      if (err) {
                        return res.status(500).send({ msg: err.message }); 
                      }
    
                      //send the email
                      var transporter = nodemailer.createTransport({ service: 'gmail', port: 25, secure: false , auth: { user: process.env.EMAIL, pass: process.env.EMAIL }, tls: { rejectUnauthorized: false } });                                          
                      var mailOptions = { from: process.env.EMAIL, to: user.email, subject: 'Account Verification Token', text: 'Hello, \n\n' + 'Please verify your account by clicking the link: \nhttp:\/\/' + req.headers.host + '\/api\/confirmation\/' + token.token + '\/' +  user.email + '\n' }; 
                      transporter.sendMail(mailOptions, function (err) {
                        if (err) { return res.status(500).send({ msg: err.message }); }
                        res.status(200).send(JSON.stringify({success:"A verification email has been sent to " + user.email , code : 'reg', user : user} ));
                      });
                    });
            })
          })
    
                
        }).catch(function (err){
          res.json(err);
        });
      }
    });
    
    });
  

module.exports = router;
