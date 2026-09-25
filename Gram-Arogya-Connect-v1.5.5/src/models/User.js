'use strict';
const { Schema, model } = require('mongoose');
const userSchema = new Schema({
  name:{type:String,required:true,trim:true},
  loginId:{type:String,required:true,unique:true,index:true,lowercase:true,trim:true},
  passwordHash:{type:String,required:true}, passwordSalt:{type:String,required:true},
  patientId:{type:String,required:true,unique:true,index:true},
  role:{type:String,enum:['patient','asha'],default:'patient',index:true},
  location:{ lat:Number, lng:Number, accuracy:Number, updatedAt:Date },
  selectedPhc:{ id:String, name:String, lat:Number, lng:Number, distanceKm:Number },
  sessionTokenHash:{type:String,default:null}, sessionExpiresAt:{type:Date,default:null}
},{timestamps:true});
module.exports = model('User', userSchema);
