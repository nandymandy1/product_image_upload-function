const fs = require("fs");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const admZip = require("adm-zip");
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, done) => done(null, "public/uploads/"),
  filename: (req, file, done) => {
    let lastIndex = file.originalname.lastIndexOf(".");
    // Get Original File Extension
    let extension = file.originalname.substring(lastIndex);
    done(null, file.fieldname + "-" + Date.now() + extension);
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
app.use(express.static(path.join(__dirname, "./public")));

// Configuration
const PORT = 3000;
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
        .json({ msg: "Product added successfully", product, success: true })
    )
    .catch(err =>
      res
        .status(403)
        .json({ msg: "Unbale to add the product.", success: false })
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

/**
 * ZIP File Extractor
 */
app.post("/zip-file-extract", upload.single("zipfile"), async (req, res) => {
  let zip = new admZip(path.join(__dirname, req.file.path));
  let folderName = req.body.productName;
  zip.extractAllTo(path.join(__dirname, `public/uploads/${folderName}`), true);
  // Delete the Zip folder from the server

  try {
    fs.unlinkSync(path.join(__dirname, req.file.path));
    // Delete the Cache Folder from the Server
  } catch (err) {
    console.error(err);
  }

  // Read the Contents of the folder
  await fs.readdir(
    path.join(__dirname, `public/uploads/${folderName}`),
    async (err, items) => {
      let folderContents = [];
      // Get All the Files
      folderContents = await items.map(
        content => `/uploads/${folderName}/${content}`
      );
      // To Read only Images
      folderContents = await folderContents.filter(files => {
        let supportedImageExtensions = [".jpeg", ".jpg", ".gif", ".png"];
        fileName = files.toLowerCase();
        let ext = fileName.substring(fileName.lastIndexOf("."));
        if (supportedImageExtensions.includes(ext)) {
          return fileName;
        }
      });

      return res.json({
        files: folderContents,
        message: "File uploaded successfully"
      });
    }
  );
});

/**
 * PUT IMAGE INTO A DIRECTORY
 */

/**
 * Default Index Route
 */
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});
