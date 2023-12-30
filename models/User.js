module.exports = (sequelize, DataTypes) => {

    const User = sequelize.define("User", {
      staffid: {
        type: DataTypes.STRING,
     
      },
  fullname: {
    type: DataTypes.STRING,
 
  },

  phone_number: {
    type: DataTypes.STRING,
  
   },
  username: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.STRING
  },
  user_roll: {
    type: DataTypes.STRING
  },
  shopwareid:{
    type: DataTypes.STRING
  },
  is_active: {
    type: DataTypes.STRING
  },
  wareid: {
    type: DataTypes.STRING
  },
  shopid: {
    type: DataTypes.STRING
  }
  
})
    return User;
};


