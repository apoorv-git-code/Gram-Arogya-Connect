'use strict';
const { Schema, model } = require('mongoose');
const appointmentSchema = new Schema({
  patientId:{type:String,required:true,index:true},
  patientName:{type:String,required:true,trim:true},
  facility:{type:String,required:true,trim:true,index:true},
  slot:{type:String,required:true,trim:true},
  tokenNumber:{type:String,required:true,unique:true,index:true},
  status:{type:String,enum:['confirmed','completed','cancelled'],default:'confirmed',index:true}
},{timestamps:true});
module.exports=model('Appointment',appointmentSchema);
