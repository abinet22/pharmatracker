const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const passport = require('passport');

const flash = require('connect-flash');
const session = require('express-session');
const ejs = require("ejs");
const path = require('path');
const cors = require("cors");
const PORT = process.env.PORT || 5001
const db = require("./models")

// create express server
const app = express();

// Passport authentication Config
require('./config/passport')(passport);

// let the app use cors
app.use(cors());
const bodyParser = require('body-parser');

// ...

// Parse JSON bodies for API requests
app.use(bodyParser.json());


// EJS
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Express session
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash messuages
app.use(flash());

// Global variables
app.use(function(req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

app.use(express.static(path.join(__dirname,'./public')));


// Routes



app.use('/', require('./routes/index'));
 app.use('/inventory', require('./routes/inventory'));
 app.use('/sales', require('./routes/sales'));
 app.use('/report', require('./routes/report'));
 app.use('/setting', require('./routes/setting'));
 app.use('/medicine', require('./routes/medicine'));
 app.use('/admin', require('./routes/admin'));
 app.use('/product', require('./routes/product'));

// In your Node.js web app

app.get('/api/exportTable/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Validate that the table name is allowed to be exported
    const allowedTables = ['Inventory', 'MedicineInfo','Warehouse','Shop','MedicineCategory',
    'MedicineGenericName','InventoryLog','MedicineSupplier','Purchase','SalesData'
   
     ]; // Add more tables as needed
    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Fetch all data from the specified table
    const getDataFunction = getExportFunction(tableName);
    if (getDataFunction) {
      const tableData = await getDataFunction();
    
      // Send the data as a response
      res.json({ [tableName]: tableData });
    } else {
      res.status(400).json({ error: 'Invalid table name' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

function getExportFunction(tableName) {
  // Define mapping between table names and corresponding export functions
  const tableExportFunctions = {
    Inventory: getAllDataInventory,
    MedicineInfo: getAllMedicineInfo,
    Warehouse: getAllWarehouse,
    Shop: getAllShop,
    MedicineCategory: getAllMedicineCategory,
    MedicineGenericName: getAllMedicineGenericName,
    InventoryLog: getAllInventoryLog,
    MedicineSupplier: getAllMedicineSupplier,
    Purchase: getAllPurchase,
    SalesData: getAllSalesData,
    // Add more mappings as needed
  };

  // Return the export function for the specified table
  return tableExportFunctions[tableName] || null;
}

async function getAllPurchase() {
  try {
    const allData = await db.Purchase.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllSalesData() {
  try {
    const allData = await db.SalesData.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllDataInventory() {
  try {
    const allData = await db.Inventory.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}

async function getAllMedicineInfo() {
  try {
    const allData = await db.MedicineInfo.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}

async function getAllWarehouse() {
  try {
    const allData = await db.Warehouse.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllShop() {
  try {
    const allData = await db.Shop.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllMedicineCategory() {
  try {
    const allData = await db.MedicineCategory.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllMedicineGenericName() {
  try {
    const allData = await db.MedicineGenericName.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllInventoryLog() {
  try {
    const allData = await db.InventoryLog.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}
async function getAllMedicineSupplier() {
  try {
    const allData = await db.MedicineSupplier.findAll({});
    return allData;
  } catch (error) {
    throw error;
  }
}

db.sequelize.sync().then(() => {
 
});


app.listen(PORT, () => {
  console.log(`listening at: http://localhost:${PORT}`)
});
