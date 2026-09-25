'use strict';
const User = require('../models/User');
const { Profile, toPlainProfile } = require('../models/Profile');
function requireAsha(req,res,next){ if((req.user.role||'patient')!=='asha') return res.status(403).json({success:false,message:'ASHA worker access required.'}); next(); }
async function patients(req,res,next){try{const users=await User.find({role:'patient'}).select('name patientId selectedPhc').sort({name:1}).lean(); const data=await Promise.all(users.map(async u=>{const doc=await Profile.findOne({patientId:u.patientId}).sort({createdAt:-1}).lean(); const profile=doc?toPlainProfile(doc):null; return {patientId:u.patientId,name:profile?.name||u.name,village:profile?.village||'',bloodGroup:profile?.bloodGroup||'',conditions:profile?.chronicConditions||[],allergies:profile?.allergies||[],primaryHealthCenter:profile?.primaryHealthCenter||u.selectedPhc?.name||'',age:profile?.age||null,gender:profile?.gender||'',lastUpdatedAt:profile?.lastUpdatedAt||null};})); res.json({success:true,data});}catch(e){next(e)}}
module.exports={requireAsha,patients};
