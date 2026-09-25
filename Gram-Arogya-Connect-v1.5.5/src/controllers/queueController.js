'use strict';
const crypto = require('crypto');
const Appointment = require('../models/Appointment');

async function getQueue(req,res,next){
  try{
    const facility=String(req.query.facility||req.user.selectedPhc?.name||'').trim();
    if(!facility) return res.json({success:true,data:{facility:null,nowServing:null,totalInQueue:0,estimatedWaitMins:null}});
    const totalInQueue=await Appointment.countDocuments({facility,status:'confirmed'});
    return res.json({success:true,data:{facility,nowServing:null,totalInQueue,estimatedWaitMins:null}});
  }catch(e){next(e)}
}
async function listAppointments(req,res,next){
  try{const rows=await Appointment.find({patientId:req.user.patientId}).sort({createdAt:-1}).limit(20).lean();return res.json({success:true,data:rows});}catch(e){next(e)}
}
async function bookAppointment(req,res,next){
  try{
    const {facility,slot}=req.body;
    const tokenNumber=`GAC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const booking=await Appointment.create({patientId:req.user.patientId,patientName:req.user.name,facility,slot,tokenNumber});
    const totalInQueue=await Appointment.countDocuments({facility,status:'confirmed'});
    const data={tokenNumber:booking.tokenNumber,patientName:booking.patientName,facility:booking.facility,slot:booking.slot,status:booking.status,bookedAt:booking.createdAt,queuePosition:totalInQueue,estimatedWaitMins:null};
    const io=req.app.get('io'); if(io) io.emit('queue:update',{facility,nowServing:null,totalInQueue,estimatedWaitMins:null});
    return res.status(201).json({success:true,message:'Appointment booked successfully.',data});
  }catch(e){next(e)}
}
function getSnapshot(){return {facility:null,nowServing:null,totalInQueue:0,estimatedWaitMins:null};}
function tick(){}
module.exports={getQueue,listAppointments,bookAppointment,getSnapshot,tick};
