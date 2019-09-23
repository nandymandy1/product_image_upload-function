const cors = require("cors");
const path = require("path");
const multer = require("multer");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

// Multer Configuration
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function(req, file, cb) {
    let lastIndex = file.originalname.lastIndexOf(".");
    // Get Original File Extension
    let extension = file.originalname.substring(lastIndex);
    cb(null, file.fieldname + "-" + Date.now() + extension);
  }
});

const upload = multer({ storage: storage });

// Initialize app
const app = express();
const mode = "dev";
// const mode = "prod";

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Set Static Directory
// app.use(express.static(path.join(__dirname, "./public")));
app.use(express.static(path.join(__dirname, "./public")));

// Configuration
const PORT = mode === "dev" ? 5000 : process.env.PORT;
const db =
  mode === "dev"
    ? "mongodb://localhost:27017/imageDB"
    : "production mongodb url";

// Database Connection
mongoose
  .connect(db, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log(`Database Connected Successfully ${db}`);
  })
  .catch(err => {
    console.log(`Error in connecting Database ${err}`);
  });

// Product Schema
const ProductSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  productImage: {
    type: String,
    default: "/uploads/default_product.jpg"
  }
});

const Product = mongoose.model("products", ProductSchema);

// Listen app on PORT
app.listen(PORT, () => console.log(`Server started on PORT ${PORT}`));

// Application routes

/**
 * Image Upload Function to Create Product
 * And store it into the Database
 */
app.post("/add-image", upload.single("image"), async (req, res, next) => {
  let newProduct = new Product({
    ...req.body
  });

  // If the product image exists
  if (req.file) {
    let filePath = req.file.path.replace("public", "");
    newProduct.productImage = filePath;
  }

  // Save the product to the database
  await newProduct
    .save()
    .then(product =>
      res
        .status(201)
        .json({ msg: "Product added successfully", product, sucess: true })
    )
    .catch(err =>
      res.status(403).json({ msg: "Unbale to add the product.", sucess: false })
    );
  next();
});

/**
 * Get all the products from the Database and send it to the User
 */
app.get("/get-products", async (req, res, next) => {
  await Product.find()
    .then(products => res.json(products))
    .catch(err =>
      res.json({
        msg: "Unable to get the products please try again later.",
        success: false
      })
    );
  next();
});
