'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const defaultProfile = {
  name: '', age: null, gender: '', bloodGroup: '', village: '',
  conditions: '', allergies: '', abhaIdMasked: null, primaryHealthCenter: ''
};

const state = {
  profile: { ...defaultProfile },
  selectedSymptoms: new Set(),
  selectedDate: 0,
  selectedSlot: '11:30 AM',
  doses: {},
  socket: null,
  language: localStorage.getItem('gac-language') || 'en',
  consultMode: 'video',
  mediaStream: null,
  callTimer: null,
  callSeconds: 0,
  sidebarCollapsed: localStorage.getItem('gac-sidebar-collapsed') === 'true'
};

const viewMeta = {
  home: ['GRAM AROGYA CONNECT', 'Good morning'],
  triage: ['GUIDED HEALTH CHECK', 'Check your symptoms'],
  teleconsult: ['VIDEO & AUDIO CARE', 'Teleconsultation'],
  appointments: ['VISITS & LIVE QUEUE', 'Appointments'],
  medicines: ['DAILY CARE', 'Medicines'],
  records: ['ABHA-LINKED', 'Health records'],
  worker: ['FIELD OPERATIONS', 'ASHA workspace']
};

const languageConfig = {
  en: { locale: 'en-IN', connected: 'Connected', offline: 'Low connection' },
  hi: { locale: 'hi-IN', connected: 'कनेक्टेड', offline: 'कम नेटवर्क' },
  mr: { locale: 'mr-IN', connected: 'जोडलेले', offline: 'कमी नेटवर्क' }
};

const phraseBook = {
  'Healthcare, closer to home.': ['स्वास्थ्य सेवा, अब घर के पास।', 'आरोग्यसेवा, आता घराजवळ.'],
  'Preparing Gram Arogya Connect…': ['Gram Arogya Connect तैयार हो रहा है…', 'Gram Arogya Connect तयार होत आहे…'],
  'Offline-ready': ['ऑफ़लाइन तैयार', 'ऑफलाइन तयार'],
  'Connected village care': ['जुड़ी हुई ग्रामीण स्वास्थ्य सेवा', 'जोडलेली ग्राम आरोग्यसेवा'],
  'Language': ['भाषा', 'भाषा'],
  'Home': ['मुख्य पृष्ठ', 'मुख्यपृष्ठ'],
  'Health check': ['स्वास्थ्य जाँच', 'आरोग्य तपासणी'],
  'Teleconsultation': ['टेलीपरामर्श', 'दूरस्थ सल्ला'],
  'Appointments': ['अपॉइंटमेंट', 'भेटी'],
  'Medicines': ['दवाइयाँ', 'औषधे'],
  'Health records': ['स्वास्थ्य रिकॉर्ड', 'आरोग्य नोंदी'],
  'ASHA workspace': ['आशा कार्यक्षेत्र', 'आशा कार्यक्षेत्र'],
  'Need assistance?': ['मदद चाहिए?', 'मदत हवी आहे?'],
  'Ask Sunita Tai anytime': ['सुनीता ताई से कभी भी पूछें', 'सुनीता ताईंना कधीही विचारा'],
  'ABHA linked': ['ABHA से जुड़ा', 'ABHA शी जोडलेले'],
  'GRAM AROGYA CONNECT': ['GRAM AROGYA CONNECT', 'GRAM AROGYA CONNECT'],
  'GUIDED HEALTH CHECK': ['मार्गदर्शित स्वास्थ्य जाँच', 'मार्गदर्शित आरोग्य तपासणी'],
  'Check your symptoms': ['अपने लक्षण जाँचें', 'तुमची लक्षणे तपासा'],
  'VISITS & LIVE QUEUE': ['भेट और लाइव कतार', 'भेटी आणि लाईव्ह रांग'],
  'DAILY CARE': ['दैनिक देखभाल', 'दैनिक काळजी'],
  'ABHA-LINKED': ['ABHA से जुड़ा', 'ABHA शी जोडलेले'],
  'FIELD OPERATIONS': ['क्षेत्र कार्य', 'क्षेत्रीय कामकाज'],
  'Good morning, Sunita': ['सुप्रभात, सुनीता', 'शुभ सकाळ, सुनीता'],
  'CARE PLAN · TODAY': ['आज की देखभाल योजना', 'आजची आरोग्य योजना'],
  'Your health, made simple.': ['आपका स्वास्थ्य, अब आसान।', 'तुमचे आरोग्य, आता सोपे.'],
  'Check symptoms, manage medicines, and reach your nearest care team—all in one place.': ['लक्षण जाँचें, दवाइयाँ संभालें और नज़दीकी स्वास्थ्य टीम से जुड़ें—सब एक ही जगह।', 'लक्षणे तपासा, औषधे सांभाळा आणि जवळच्या आरोग्य सेवेशी जोडा—सर्व एकाच ठिकाणी.'],
  'Start health check': ['स्वास्थ्य जाँच शुरू करें', 'आरोग्य तपासणी सुरू करा'],
  'Book a visit': ['अपॉइंटमेंट लें', 'भेट बुक करा'],
  'Care is ready': ['देखभाल तैयार है', 'सेवा तयार आहे'],
  'QUICK ACTIONS': ['त्वरित कार्य', 'जलद कृती'],
  'What would you like to do?': ['आप क्या करना चाहेंगे?', 'तुम्हाला काय करायचे आहे?'],
  'Check symptoms': ['लक्षण जाँचें', 'लक्षणे तपासा'],
  'Guided health assessment': ['मार्गदर्शित स्वास्थ्य आकलन', 'मार्गदर्शित आरोग्य मूल्यांकन'],
  'Book PHC visit': ['PHC अपॉइंटमेंट लें', 'PHC भेट बुक करा'],
  'Choose a time, skip the queue': ['समय चुनें, कतार से बचें', 'वेळ निवडा, रांग टाळा'],
  'Track medicines': ['दवाइयाँ ट्रैक करें', 'औषधांची नोंद ठेवा'],
  '2 doses remaining today': ['आज 2 खुराक बाकी हैं', 'आज 2 डोस बाकी आहेत'],
  'View records': ['रिकॉर्ड देखें', 'नोंदी पाहा'],
  'ABHA-linked health history': ['ABHA से जुड़ा स्वास्थ्य इतिहास', 'ABHA शी जोडलेला आरोग्य इतिहास'],
  'TODAY': ['आज', 'आज'],
  'Your care timeline': ['आज की देखभाल', 'आजची आरोग्य रूपरेषा'],
  'Morning BP recorded': ['सुबह का BP दर्ज हुआ', 'सकाळचा BP नोंदवला'],
  'Done': ['पूरा', 'पूर्ण'],
  'After lunch · 01:30 PM': ['दोपहर के भोजन के बाद · 01:30', 'दुपारच्या जेवणानंतर · 01:30'],
  'View': ['देखें', 'पाहा'],
  'PHC follow-up': ['PHC फॉलो-अप', 'PHC पाठपुरावा'],
  'Tomorrow · 11:30 AM': ['कल · 11:30', 'उद्या · 11:30'],
  'Upcoming': ['आगामी', 'आगामी'],
  'HEALTH SNAPSHOT': ['स्वास्थ्य सारांश', 'आरोग्य सारांश'],
  'See history': ['इतिहास देखें', 'इतिहास पाहा'],
  'Watch': ['ध्यान दें', 'लक्ष द्या'],
  'Normal': ['सामान्य', 'सामान्य'],
  'Pulse': ['नाड़ी', 'नाडी'],
  'A small reminder': ['एक छोटी याद', 'एक छोटी आठवण'],
  'Rest for five minutes before your next BP reading.': ['अगला BP मापने से पहले पाँच मिनट आराम करें।', 'पुढील BP मोजण्यापूर्वी पाच मिनिटे विश्रांती घ्या.'],
  'YOUR VILLAGE HEALTH GUIDE': ['आपकी ग्राम स्वास्थ्य मार्गदर्शक', 'तुमची ग्राम आरोग्य मार्गदर्शक'],
  'Namaste, I’m Sunita Tai.': ['नमस्ते, मैं सुनीता ताई हूँ।', 'नमस्कार, मी सुनीता ताई.'],
  'Ask me about symptoms, medicines, schemes, or your next PHC visit.': ['मुझसे लक्षण, दवाइयाँ, योजनाएँ या अगली PHC यात्रा के बारे में पूछें।', 'लक्षणे, औषधे, योजना किंवा पुढील PHC भेटीबद्दल मला विचारा.'],
  'Ask Sunita Tai': ['सुनीता ताई से पूछें', 'सुनीता ताईंना विचारा'],
  'GUIDED CHECK': ['मार्गदर्शित जाँच', 'मार्गदर्शित तपासणी'],
  'How are you feeling today?': ['आज आप कैसा महसूस कर रहे हैं?', 'आज तुम्हाला कसे वाटत आहे?'],
  'Select everything you feel. This helps your care team understand what you need.': ['जो भी महसूस हो रहा है, उसे चुनें। इससे देखभाल टीम आपकी जरूरत समझेगी।', 'तुम्हाला जे काही जाणवते ते निवडा. यामुळे आरोग्य टीमला तुमची गरज समजेल.'],
  'Your answers stay private': ['आपके जवाब निजी रहते हैं', 'तुमची उत्तरे खाजगी राहतात'],
  'Choose your symptoms': ['अपने लक्षण चुनें', 'तुमची लक्षणे निवडा'],
  'You can select more than one': ['आप एक से अधिक चुन सकते हैं', 'तुम्ही एकापेक्षा अधिक निवडू शकता'],
  'Anything else?': ['कुछ और?', 'आणखी काही?'],
  'Check my symptoms': ['मेरे लक्षण जाँचें', 'माझी लक्षणे तपासा'],
  'DOCTOR SUPPORT': ['डॉक्टर सहायता', 'डॉक्टर मदत'],
  'A doctor is one tap away': ['डॉक्टर बस एक टैप दूर हैं', 'डॉक्टर फक्त एका टॅपवर'],
  'Connect with the PHC care team if you are unsure or worried.': ['अगर आप चिंतित या अनिश्चित हैं तो PHC टीम से जुड़ें।', 'शंका किंवा काळजी असल्यास PHC टीमशी संपर्क करा.'],
  'Talk to a doctor': ['डॉक्टर से बात करें', 'डॉक्टरांशी बोला'],
  'Available today · 8 AM–8 PM': ['आज उपलब्ध · सुबह 8–रात 8', 'आज उपलब्ध · सकाळी 8–रात्री 8'],
  'Fever': ['बुखार', 'ताप'], 'Cough': ['खाँसी', 'खोकला'], 'Headache': ['सिरदर्द', 'डोकेदुखी'],
  'Stomach pain': ['पेट दर्द', 'पोटदुखी'], 'Dizziness': ['चक्कर', 'चक्कर'], 'Weakness': ['कमजोरी', 'अशक्तपणा'],
  'Breathlessness': ['साँस फूलना', 'श्वास घेण्यास त्रास'], 'Chest pain': ['सीने में दर्द', 'छातीत दुखणे'], 'Pregnancy concern': ['गर्भावस्था चिंता', 'गर्भावस्थेची चिंता'],
  'VIDEO & AUDIO CARE': ['वीडियो और ऑडियो देखभाल', 'व्हिडिओ आणि ऑडिओ सेवा'],
  'Talk to a doctor from home.': ['घर से डॉक्टर से बात करें।', 'घरातून डॉक्टरांशी बोला.'],
  'Connect securely with a PHC doctor, share your symptom summary, and receive clear next steps.': ['PHC डॉक्टर से सुरक्षित जुड़ें, लक्षण साझा करें और आगे के स्पष्ट निर्देश पाएँ।', 'PHC डॉक्टरांशी सुरक्षितपणे जोडा, लक्षणे शेअर करा आणि पुढील स्पष्ट सूचना मिळवा.'],
  'Private consultation': ['निजी परामर्श', 'खाजगी सल्ला'],
  'Ready to connect': ['जुड़ने के लिए तैयार', 'जोडण्यासाठी तयार'],
  '⌾ Encrypted': ['⌾ सुरक्षित', '⌾ सुरक्षित'],
  'Mute': ['म्यूट', 'म्यूट'], 'Camera': ['कैमरा', 'कॅमेरा'], 'End': ['समाप्त', 'समाप्त'],
  'CONSULTATION MODE': ['परामर्श का तरीका', 'सल्ल्याचा प्रकार'],
  'How would you like to connect?': ['आप कैसे जुड़ना चाहेंगे?', 'तुम्हाला कसे जोडायचे आहे?'],
  'Video call': ['वीडियो कॉल', 'व्हिडिओ कॉल'], 'Audio only': ['केवल ऑडियो', 'फक्त ऑडिओ'],
  'Start consultation': ['परामर्श शुरू करें', 'सल्ला सुरू करा'],
  'By continuing, you consent to sharing your current profile and selected symptoms with the doctor.': ['आगे बढ़कर आप वर्तमान प्रोफ़ाइल और चुने हुए लक्षण डॉक्टर से साझा करने की सहमति देते हैं।', 'पुढे जाऊन तुम्ही सध्याची प्रोफाइल आणि निवडलेली लक्षणे डॉक्टरांशी शेअर करण्यास संमती देता.'],
  'Available now': ['अभी उपलब्ध', 'आता उपलब्ध'], 'MBBS · Family Medicine': ['MBBS · पारिवारिक चिकित्सा', 'MBBS · कौटुंबिक वैद्यक'],
  'Languages': ['भाषाएँ', 'भाषा'], 'Experience': ['अनुभव', 'अनुभव'], '12 years': ['12 वर्ष', '12 वर्षे'],
  '238 village consultations': ['238 ग्रामीण परामर्श', '238 ग्रामीण सल्ले'],
  'BEFORE YOU JOIN': ['जुड़ने से पहले', 'जोडण्यापूर्वी'], 'Device check': ['डिवाइस जाँच', 'डिव्हाइस तपासणी'], 'Check again': ['फिर जाँचें', 'पुन्हा तपासा'],
  'Network': ['नेटवर्क', 'नेटवर्क'], 'Connection looks good': ['कनेक्शन अच्छा है', 'कनेक्शन चांगले आहे'],
  'Microphone': ['माइक्रोफोन', 'मायक्रोफोन'], 'Checked when call starts': ['कॉल शुरू होने पर जाँच होगी', 'कॉल सुरू होताना तपासले जाईल'],
  'Schedule for later': ['बाद के लिए तय करें', 'नंतरची वेळ ठरवा'], 'Choose a doctor and preferred time': ['डॉक्टर और समय चुनें', 'डॉक्टर आणि वेळ निवडा'],
  'RECENT CONSULTATIONS': ['हाल के परामर्श', 'अलीकडील सल्ले'], 'Your care conversations': ['आपकी स्वास्थ्य बातचीत', 'तुमचे आरोग्य संवाद'],
  'Blood pressure follow-up': ['रक्तचाप फॉलो-अप', 'रक्तदाब पाठपुरावा'], 'Medicine review': ['दवा समीक्षा', 'औषध आढावा'], 'Summary →': ['सारांश →', 'सारांश →'],
  'PHC APPOINTMENTS': ['PHC अपॉइंटमेंट', 'PHC भेटी'], 'Plan your visit without the wait.': ['बिना प्रतीक्षा अपनी यात्रा तय करें।', 'प्रतीक्षा न करता भेटीचे नियोजन करा.'],
  'Pick your facility and preferred time. Your live token updates automatically.': ['केंद्र और समय चुनें। आपका लाइव टोकन अपने आप अपडेट होगा।', 'केंद्र आणि वेळ निवडा. तुमचे लाईव्ह टोकन आपोआप अपडेट होईल.'],
  'Healthcare facility': ['स्वास्थ्य केंद्र', 'आरोग्य केंद्र'], 'Choose a date': ['तारीख चुनें', 'तारीख निवडा'], 'Available time': ['उपलब्ध समय', 'उपलब्ध वेळ'],
  'Confirm appointment': ['अपॉइंटमेंट पक्का करें', 'भेट निश्चित करा'], 'LIVE QUEUE': ['लाइव कतार', 'लाईव्ह रांग'], 'Live': ['लाइव', 'लाईव्ह'],
  'Now serving': ['अभी सेवा में', 'सध्या सेवा'], 'People waiting': ['प्रतीक्षा में लोग', 'प्रतीक्षेत लोक'], 'Estimated wait': ['अनुमानित प्रतीक्षा', 'अंदाजे प्रतीक्षा'],
  'Queue information refreshes automatically when connected.': ['कनेक्ट होने पर कतार की जानकारी अपने आप अपडेट होती है।', 'जोडलेले असताना रांगेची माहिती आपोआप अपडेट होते.'],
  'DAILY MEDICINES': ['दैनिक दवाइयाँ', 'दैनिक औषधे'], 'Stay on track, one dose at a time.': ['एक-एक खुराक के साथ नियमित रहें।', 'प्रत्येक डोससोबत नियमित राहा.'],
  'Tap “Taken” after each dose. Your progress is saved on this device.': ['हर खुराक के बाद “लिया” दबाएँ। प्रगति इस डिवाइस पर सुरक्षित रहेगी।', 'प्रत्येक डोसनंतर “घेतले” दाबा. प्रगती या डिव्हाइसवर जतन होईल.'],
  'Today': ['आज', 'आज'], 'TODAY’S SCHEDULE': ['आज की समय-सारणी', 'आजचे वेळापत्रक'], 'LATEST PRESCRIPTION': ['नवीनतम पर्चा', 'नवीनतम प्रिस्क्रिप्शन'],
  'Wednesday, 17 September': ['बुधवार, 17 सितंबर', 'बुधवार, 17 सप्टेंबर'], 'Updated 12 September 2026': ['12 सितंबर 2026 को अपडेट', '12 सप्टेंबर 2026 रोजी अद्ययावत'],
  'View prescription': ['पर्चा देखें', 'प्रिस्क्रिप्शन पाहा'], 'Morning': ['सुबह', 'सकाळ'], 'Afternoon': ['दोपहर', 'दुपार'], 'Night': ['रात', 'रात्र'],
  'After breakfast': ['नाश्ते के बाद', 'नाश्त्यानंतर'], 'After lunch': ['दोपहर के भोजन के बाद', 'दुपारच्या जेवणानंतर'], 'After dinner': ['रात के भोजन के बाद', 'रात्रीच्या जेवणानंतर'],
  'Mark taken': ['लिया हुआ दर्ज करें', 'घेतल्याची नोंद करा'], '✓ Taken': ['✓ लिया', '✓ घेतले'],
  'ABHA HEALTH RECORDS': ['ABHA स्वास्थ्य रिकॉर्ड', 'ABHA आरोग्य नोंदी'], 'Your health story, safely together.': ['आपकी स्वास्थ्य कहानी, सुरक्षित और एक साथ।', 'तुमचा आरोग्य इतिहास, सुरक्षित आणि एकत्र.'],
  'Important information for you and your care team, even with low connectivity.': ['कम नेटवर्क में भी आपके और देखभाल टीम के लिए जरूरी जानकारी।', 'कमी नेटवर्कमध्येही तुमच्यासाठी आणि आरोग्य टीमसाठी महत्त्वाची माहिती.'],
  'Name': ['नाम', 'नाव'], 'ABHA number': ['ABHA नंबर', 'ABHA क्रमांक'], '✓ Verified': ['✓ सत्यापित', '✓ सत्यापित'],
  'Female · 34 years · B+': ['महिला · 34 वर्ष · B+', 'महिला · 34 वर्षे · B+'], 'Hypertension': ['उच्च रक्तचाप', 'उच्च रक्तदाब'], 'Sulfa drugs': ['सल्फा दवाइयाँ', 'सल्फा औषधे'],
  'None recorded': ['कोई जानकारी दर्ज नहीं', 'माहिती नोंदवलेली नाही'],
  'MEDICAL SUMMARY': ['चिकित्सा सारांश', 'वैद्यकीय सारांश'], 'Shared with your care team': ['आपकी देखभाल टीम के साथ साझा', 'आरोग्य टीमसोबत शेअर केलेले'],
  'Up to date': ['अद्यतनित', 'अद्ययावत'], 'Conditions': ['स्वास्थ्य स्थितियाँ', 'आरोग्य समस्या'], 'Allergies': ['एलर्जी', 'अॅलर्जी'], 'Blood group': ['रक्त समूह', 'रक्तगट'], 'Last visit': ['पिछली यात्रा', 'मागील भेट'],
  'RECENT ACTIVITY': ['हाल की गतिविधि', 'अलीकडील कृती'], 'Documents and consultations': ['दस्तावेज़ और परामर्श', 'कागदपत्रे आणि सल्ले'],
  'PHC prescription': ['PHC पर्चा', 'PHC प्रिस्क्रिप्शन'], 'Blood test report': ['रक्त जाँच रिपोर्ट', 'रक्त तपासणी अहवाल'], 'Outpatient consultation': ['बाह्यरोगी परामर्श', 'बाह्यरुग्ण सल्ला'],
  'View →': ['देखें →', 'पाहा →'], 'ASHA WORKSPACE': ['आशा कार्यक्षेत्र', 'आशा कार्यक्षेत्र'], 'Today’s village care list.': ['आज की ग्राम देखभाल सूची।', 'आजची ग्राम आरोग्य यादी.'],
  'Prioritised visits, risk flags, and offline records ready to sync.': ['प्राथमिक यात्राएँ, जोखिम संकेत और सिंक के लिए तैयार ऑफ़लाइन रिकॉर्ड।', 'प्राधान्य भेटी, जोखीम चिन्हे आणि सिंकसाठी तयार ऑफलाइन नोंदी.'],
  'Sync 3 records': ['3 रिकॉर्ड सिंक करें', '3 नोंदी सिंक करा'], 'Home visits': ['घर की यात्राएँ', 'गृहभेटी'], '3 completed': ['3 पूरी', '3 पूर्ण'], 'High priority': ['उच्च प्राथमिकता', 'उच्च प्राधान्य'],
  'Needs attention': ['ध्यान आवश्यक', 'लक्ष आवश्यक'], 'Offline records': ['ऑफ़लाइन रिकॉर्ड', 'ऑफलाइन नोंदी'], 'Ready to sync': ['सिंक के लिए तैयार', 'सिंकसाठी तयार'], 'Households covered': ['कवर किए घर', 'समाविष्ट कुटुंबे'], 'This month': ['इस महीने', 'या महिन्यात'],
  'PRIORITY VISITS': ['प्राथमिक यात्राएँ', 'प्राधान्य भेटी'], 'Patients needing follow-up': ['फॉलो-अप वाले मरीज', 'पाठपुरावा आवश्यक रुग्ण'], 'View all': ['सभी देखें', 'सर्व पाहा'],
  'Follow-up': ['फॉलो-अप', 'पाठपुरावा'], 'Routine': ['नियमित', 'नियमित'], 'Open': ['खोलें', 'उघडा'],
  'High-risk pregnancy · 32 weeks': ['उच्च जोखिम गर्भावस्था · 32 सप्ताह', 'उच्च जोखीम गर्भावस्था · 32 आठवडे'], 'Diabetes follow-up · Glucose due': ['मधुमेह फॉलो-अप · ग्लूकोज़ जाँच बाकी', 'मधुमेह पाठपुरावा · ग्लुकोज तपासणी बाकी'], 'Infant vaccination · Dose 2': ['शिशु टीकाकरण · खुराक 2', 'बाल लसीकरण · डोस 2'],
  'Check': ['जाँच', 'तपासणी'], 'Book a PHC visit': ['PHC अपॉइंटमेंट लें', 'PHC भेट बुक करा'],
  'Doctor': ['डॉक्टर', 'डॉक्टर'], 'Visits': ['यात्राएँ', 'भेटी'], 'Records': ['रिकॉर्ड', 'नोंदी'], 'Emergency': ['आपातकाल', 'आपत्काल'],
  'PERSONAL DETAILS': ['व्यक्तिगत विवरण', 'वैयक्तिक माहिती'], 'Your profile': ['आपकी प्रोफ़ाइल', 'तुमची प्रोफाइल'], 'Full name': ['पूरा नाम', 'पूर्ण नाव'], 'Age': ['उम्र', 'वय'], 'Village': ['गाँव', 'गाव'], 'Save profile': ['प्रोफ़ाइल सहेजें', 'प्रोफाइल जतन करा'],
  'EMERGENCY HELP': ['आपातकालीन सहायता', 'आपत्कालीन मदत'], 'Call an ambulance?': ['एम्बुलेंस बुलाएँ?', 'रुग्णवाहिका बोलवायची?'],
  'We’ll share your name and current location with the nearest emergency team.': ['हम आपका नाम और स्थान नज़दीकी आपातकालीन टीम से साझा करेंगे।', 'आम्ही तुमचे नाव आणि स्थान जवळच्या आपत्कालीन टीमसोबत शेअर करू.'],
  'Send emergency alert': ['आपातकालीन अलर्ट भेजें', 'आपत्कालीन सूचना पाठवा'], 'Cancel': ['रद्द करें', 'रद्द करा'], 'For immediate voice assistance, call 108.': ['तुरंत सहायता के लिए 108 पर कॉल करें।', 'तातडीच्या मदतीसाठी 108 वर कॉल करा.'],
  'ALERT SENT': ['अलर्ट भेजा गया', 'सूचना पाठवली'], 'Help is on the way.': ['मदद रास्ते में है।', 'मदत येत आहे.'], 'The nearest response team has been notified.': ['नज़दीकी टीम को सूचित किया गया है।', 'जवळच्या टीमला माहिती दिली आहे.'], 'Return to app': ['ऐप पर लौटें', 'अॅपवर परत या'],
  'Village health guide': ['ग्राम स्वास्थ्य मार्गदर्शक', 'ग्राम आरोग्य मार्गदर्शक'], 'My BP is high': ['मेरा BP अधिक है', 'माझा BP जास्त आहे'], 'Medicine reminder': ['दवा की याद', 'औषध आठवण'],
  'Namaste! How can I help you today? You can ask about medicines, symptoms, appointments, or government schemes.': ['नमस्ते! आज मैं आपकी कैसे मदद कर सकती हूँ? आप दवाइयों, लक्षणों, अपॉइंटमेंट या सरकारी योजनाओं के बारे में पूछ सकते हैं।', 'नमस्कार! आज मी तुमची कशी मदत करू शकते? तुम्ही औषधे, लक्षणे, भेटी किंवा सरकारी योजनांबद्दल विचारू शकता.'],
  'Saved': ['सहेजा गया', 'जतन केले'], 'Your changes were saved.': ['आपके बदलाव सहेजे गए।', 'तुमचे बदल जतन झाले.'],
  'Document ready': ['दस्तावेज़ तैयार', 'कागदपत्र तयार'], 'This demo record is available in your ABHA timeline.': ['यह डेमो रिकॉर्ड आपकी ABHA समयरेखा में उपलब्ध है।', 'ही डेमो नोंद तुमच्या ABHA आरोग्यक्रमात उपलब्ध आहे.'],
  'Visit opened': ['यात्रा खोली गई', 'भेट उघडली'], 'Patient details are ready for the ASHA worker.': ['मरीज का विवरण आशा कार्यकर्ता के लिए तैयार है।', 'रुग्णाची माहिती आशा कार्यकर्तीसाठी तयार आहे.'],
  'Select a symptom': ['एक लक्षण चुनें', 'एक लक्षण निवडा'], 'Choose at least one symptom before continuing.': ['आगे बढ़ने से पहले कम से कम एक लक्षण चुनें।', 'पुढे जाण्यापूर्वी किमान एक लक्षण निवडा.'],
  'Confirming…': ['पुष्टि हो रही है…', 'निश्चित करत आहे…'], 'Appointment confirmed': ['अपॉइंटमेंट पक्का हुआ', 'भेट निश्चित झाली'],
  'Dose recorded': ['खुराक दर्ज हुई', 'डोस नोंदवला'], 'Dose marked incomplete': ['खुराक अधूरी दर्ज हुई', 'डोस अपूर्ण म्हणून नोंदवला'],
  'Profile updated': ['प्रोफ़ाइल अपडेट हुई', 'प्रोफाइल अद्ययावत झाली'], 'Your changes were securely synced.': ['आपके बदलाव सुरक्षित रूप से सिंक हुए।', 'तुमचे बदल सुरक्षितपणे सिंक झाले.'],
  'Saved on this device': ['इस डिवाइस पर सहेजा गया', 'या डिव्हाइसवर जतन केले'], 'Changes will sync when you are connected.': ['कनेक्ट होने पर बदलाव सिंक होंगे।', 'कनेक्शन मिळाल्यावर बदल सिंक होतील.'],
  'Sending alert…': ['अलर्ट भेजा जा रहा है…', 'सूचना पाठवत आहे…'], 'Records synced': ['रिकॉर्ड सिंक हुए', 'नोंदी सिंक झाल्या'],
  'Sync complete': ['सिंक पूरा हुआ', 'सिंक पूर्ण झाले'], 'Still saved offline': ['अभी भी ऑफ़लाइन सुरक्षित', 'अजूनही ऑफलाइन जतन'], 'We’ll retry when the connection improves.': ['कनेक्शन बेहतर होने पर फिर कोशिश होगी।', 'कनेक्शन सुधारल्यावर पुन्हा प्रयत्न करू.'], 'Retry sync': ['फिर सिंक करें', 'पुन्हा सिंक करा']
};

let staticTextNodes = [];

const symptoms = [
  { id: 'fever', label: 'Fever', icon: '♨' },
  { id: 'cough', label: 'Cough', icon: '◌' },
  { id: 'headache', label: 'Headache', icon: '◉' },
  { id: 'stomach', label: 'Stomach pain', icon: '◇' },
  { id: 'dizziness', label: 'Dizziness', icon: '≈' },
  { id: 'weakness', label: 'Weakness', icon: '↘' },
  { id: 'breathing', label: 'Breathlessness', icon: '≋' },
  { id: 'chest', label: 'Chest pain', icon: '♡' },
  { id: 'maternal', label: 'Pregnancy concern', icon: '○' }
];

const medicines = [];

document.addEventListener('DOMContentLoaded', init);

function init() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  const preferredLanguage = state.language;
  state.language = 'en';
  bindSidebar();
  initAccount();
  bindNavigation();
  bindActions();
  renderDates();
  renderSlots();
  renderSymptoms();
  renderMedicines();
  updateProfileUI();
  captureStaticText();
  applyLanguage(preferredLanguage);
  initRealtimeQueue();
  fetchQueue();
  runLoader();
  window.addEventListener('online', updateConnectionState);
  window.addEventListener('offline', updateConnectionState);
  window.addEventListener('hashchange', routeFromHash);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeAllOverlays();
  });
  routeFromHash();
}

function runLoader() {
  const loader = $('#app-loader');
  const progress = $('#loader-progress');
  const message = $('#loader-message');
  const messages = {
    en: ['Checking offline health records…', 'Connecting to village care services…', 'Preparing today’s care plan…', 'Everything is ready.'],
    hi: ['ऑफ़लाइन स्वास्थ्य रिकॉर्ड जाँचे जा रहे हैं…', 'ग्राम स्वास्थ्य सेवाओं से जुड़ रहे हैं…', 'आज की देखभाल योजना तैयार हो रही है…', 'सब कुछ तैयार है।'],
    mr: ['ऑफलाइन आरोग्य नोंदी तपासत आहोत…', 'ग्राम आरोग्य सेवांशी जोडत आहोत…', 'आजची आरोग्य योजना तयार होत आहे…', 'सर्व काही तयार आहे.']
  }[state.language];
  const steps = [[22, messages[0]], [48, messages[1]], [74, messages[2]], [100, messages[3]]];
  let index = 0;
  const tick = () => {
    const [value, text] = steps[index];
    progress.style.width = `${value}%`;
    message.textContent = text;
    index += 1;
    if (index < steps.length) return setTimeout(tick, 310);
    setTimeout(() => {
      loader.classList.add('is-finished');
      $('#app').setAttribute('aria-hidden', 'false');
      setTimeout(() => loader.remove(), 650);
    }, 330);
  };
  setTimeout(tick, 180);
}

function bindNavigation() {
  $$('[data-page]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.page)));
  $$('[data-go]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.go)));
  $$('[data-nav]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    navigate(link.dataset.nav);
  }));
}

function bindSidebar() {
  const toggle = $('#sidebar-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem('gac-sidebar-collapsed', String(state.sidebarCollapsed));
    applySidebarState();
  });
  window.addEventListener('resize', applySidebarState, { passive: true });
  applySidebarState();
}

function applySidebarState() {
  const shell = $('#app');
  const toggle = $('#sidebar-toggle');
  if (!shell || !toggle) return;
  const collapsed = state.sidebarCollapsed && window.innerWidth > 900;
  shell.classList.toggle('sidebar-collapsed', collapsed);
  toggle.setAttribute('aria-expanded', String(!collapsed));
  const labels = state.language === 'hi'
    ? ['साइडबार खोलें', 'साइडबार छोटा करें']
    : state.language === 'mr'
      ? ['साइडबार उघडा', 'साइडबार लहान करा']
      : ['Expand sidebar', 'Collapse sidebar'];
  const label = collapsed ? labels[0] : labels[1];
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const assistiveLabel = $('.sr-only', toggle);
  if (assistiveLabel) assistiveLabel.textContent = label;
}

function updateSidebarTooltips() {
  $$('.side-nav .nav-item').forEach(button => {
    const label = $('.nav-label', button);
    if (label) button.dataset.tooltip = label.textContent.trim();
  });
}

function navigate(view, updateHash = true) {
  if (!viewMeta[view]) view = 'home';
  if (view === 'worker' && currentUser?.role !== 'asha') view = 'home';
  if (view === 'worker') loadAshaPatients();
  $$('.page').forEach(page => page.classList.toggle('is-active', page.dataset.view === view));
  $$('[data-page]').forEach(button => button.classList.toggle('is-active', button.dataset.page === view));
  const [eyebrow, title] = viewMeta[view];
  $('#view-eyebrow').textContent = translate(eyebrow);
  $('#view-title').textContent = view === 'home' ? `${greeting()}, ${firstName(state.profile.name)}` : translate(title);
  if (updateHash && location.hash !== `#${view}`) history.pushState(null, '', `#${view}`);
  window.scrollTo({ top: 0, behavior: updateHash ? 'smooth' : 'auto' });
}

function routeFromHash() {
  navigate(location.hash.replace('#', '') || 'home', false);
}

function bindActions() {
  $$('[data-action="profile"]').forEach(button => button.addEventListener('click', () => openModal('profile')));
  $$('[data-action="sos"]').forEach(button => button.addEventListener('click', () => openModal('sos')));
  $$('[data-action="assistant"]').forEach(button => button.addEventListener('click', openAssistant));
  $$('[data-action="doctor"]').forEach(button => button.addEventListener('click', () => navigate('teleconsult')));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => closeOverlay(button.dataset.close)));
  $('#profile-form').addEventListener('submit', saveProfile);
  $('#assess-button').addEventListener('click', assessSymptoms);
  $('#book-button').addEventListener('click', bookAppointment);
  $('#dispatch-sos').addEventListener('click', dispatchSOS);
  $('#sync-button')?.addEventListener('click', syncOfflineRecords);
  $('#facility-select').addEventListener('change', event => $('#queue-facility').textContent = event.target.value);
  $('#language-select').addEventListener('change', event => applyLanguage(event.target.value));
  $('#chat-form').addEventListener('submit', sendChat);
  $$('[data-consult-mode]').forEach(button => button.addEventListener('click', () => selectConsultMode(button.dataset.consultMode)));
  $('#start-consultation').addEventListener('click', startConsultation);
  $('#end-consultation').addEventListener('click', endConsultation);
  $('#toggle-mic').addEventListener('click', toggleMicrophone);
  $('#toggle-camera').addEventListener('click', toggleCamera);
  $('#rerun-device-check').addEventListener('click', runDeviceCheck);
  $('#schedule-consultation').addEventListener('click', () => {
    navigate('appointments');
    showToast(translate('Appointments'), translate('Choose a date'));
  });
  $$('.suggestion-chips button').forEach(button => button.addEventListener('click', () => answerAssistant(button.textContent)));
  $$('.documents-list button').forEach(button => button.addEventListener('click', () => showToast(translate('Document ready'), translate('This demo record is available in your ABHA timeline.'))));

}

function openModal(name) {
  if (name === 'profile') populateProfileForm();
  if (name === 'sos') {
    $('#sos-ready').hidden = false;
    $('#sos-sent').hidden = true;
  }
  $(`#${name}-modal`).hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeOverlay(name) {
  if (name === 'assistant') $('#assistant-drawer').hidden = true;
  else {
    const modal = $(`#${name}-modal`);
    if (modal) modal.hidden = true;
  }
  if ($$('.modal:not([hidden])').length === 0) document.body.style.overflow = '';
}

function closeAllOverlays() {
  $$('.modal').forEach(modal => modal.hidden = true);
  $('#assistant-drawer').hidden = true;
  document.body.style.overflow = '';
}

function openAssistant() {
  $('#assistant-drawer').hidden = false;
  setTimeout(() => $('#chat-input').focus(), 100);
}

function renderSymptoms() {
  $('#symptom-grid').innerHTML = symptoms.map(item => `
    <button class="symptom-card${state.selectedSymptoms.has(item.id) ? ' is-selected' : ''}" type="button" data-symptom="${item.id}" aria-pressed="${state.selectedSymptoms.has(item.id)}">
      <span aria-hidden="true">${item.icon}</span><strong>${translate(item.label)}</strong>
    </button>`).join('');
  $$('.symptom-card').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.symptom;
    state.selectedSymptoms.has(id) ? state.selectedSymptoms.delete(id) : state.selectedSymptoms.add(id);
    button.classList.toggle('is-selected');
    button.setAttribute('aria-pressed', String(state.selectedSymptoms.has(id)));
  }));
}

function assessSymptoms() {
  const result = $('#triage-result');
  if (!state.selectedSymptoms.size) {
    showToast(translate('Select a symptom'), translate('Choose at least one symptom before continuing.'), '!');
    return;
  }
  const urgent = ['chest', 'breathing', 'maternal'].some(item => state.selectedSymptoms.has(item));
  const names = symptoms.filter(item => state.selectedSymptoms.has(item.id)).map(item => translate(item.label).toLowerCase());
  const resultTitle = urgent
    ? (state.language === 'hi' ? 'कृपया अभी डॉक्टर से बात करें' : state.language === 'mr' ? 'कृपया आत्ताच डॉक्टरांशी बोला' : 'Please speak to a clinician now')
    : (state.language === 'hi' ? 'घर पर देखभाल उचित हो सकती है' : state.language === 'mr' ? 'घरी काळजी घेणे योग्य असू शकते' : 'Home care may be appropriate');
  const resultCopy = urgent
    ? (state.language === 'hi' ? `आपने ${joinWords(names)} चुना है। इन लक्षणों पर तुरंत चिकित्सकीय ध्यान जरूरी है। लक्षण गंभीर हों तो SOS दबाएँ या 108 पर कॉल करें।` : state.language === 'mr' ? `तुम्ही ${joinWords(names)} निवडले आहे. या लक्षणांसाठी त्वरित वैद्यकीय मदत आवश्यक आहे. लक्षणे गंभीर असल्यास SOS दाबा किंवा 108 वर कॉल करा.` : `You selected ${joinWords(names)}. These symptoms deserve prompt clinical attention. If symptoms are severe, use the SOS button or call 108.`)
    : (state.language === 'hi' ? `आपने ${joinWords(names)} चुना है। आराम करें, पानी पिएँ और लक्षणों पर नज़र रखें। वे बने रहें या बढ़ें तो PHC अपॉइंटमेंट लें।` : state.language === 'mr' ? `तुम्ही ${joinWords(names)} निवडले आहे. विश्रांती घ्या, पाणी प्या आणि लक्षणांवर लक्ष ठेवा. ती कायम राहिल्यास किंवा वाढल्यास PHC भेट बुक करा.` : `You selected ${joinWords(names)}. Rest, drink fluids, and monitor how you feel. Book a PHC visit if symptoms persist or worsen.`);
  const resultAction = urgent ? translate('Talk to a doctor') : translate('Book a visit');
  result.className = `result-card${urgent ? ' is-urgent' : ''}`;
  result.innerHTML = `
    <span class="result-icon">${urgent ? '!' : '✓'}</span>
    <div><h3>${resultTitle}</h3><p>${resultCopy}</p></div>
    <button class="btn ${urgent ? 'btn--danger' : 'btn--primary'}" data-result-action>${resultAction}</button>`;
  result.hidden = false;
  $('[data-result-action]', result).addEventListener('click', () => urgent ? navigate('teleconsult') : navigate('appointments'));
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderDates() {
  const formatter = new Intl.DateTimeFormat(languageConfig[state.language].locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const dates = Array.from({ length: 4 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const parts = formatter.format(date).split(' ');
    return { value: date.toISOString().slice(0, 10), day: offset === 0 ? translate('Today') : parts[0], date: parts.slice(1).join(' ') };
  });
  $('#date-options').innerHTML = dates.map((date, index) => `<button type="button" class="option-button${index === state.selectedDate ? ' is-selected' : ''}" data-date-index="${index}" data-date-value="${date.value}">${date.day}<small>${date.date}</small></button>`).join('');
  $$('[data-date-index]').forEach(button => button.addEventListener('click', () => {
    state.selectedDate = Number(button.dataset.dateIndex);
    $$('[data-date-index]').forEach(item => item.classList.toggle('is-selected', item === button));
  }));
  const today = new Date();
  $('#today-date').textContent = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();
}

function renderSlots() {
  const slots = ['9:00 AM', '11:30 AM', '2:00 PM', '3:30 PM', '5:00 PM', '6:30 PM'];
  $('#slot-options').innerHTML = slots.map(slot => `<button type="button" class="option-button${slot === state.selectedSlot ? ' is-selected' : ''}" data-slot="${slot}">${slot}</button>`).join('');
  $$('[data-slot]').forEach(button => button.addEventListener('click', () => {
    state.selectedSlot = button.dataset.slot;
    $$('[data-slot]').forEach(item => item.classList.toggle('is-selected', item === button));
  }));
}

async function bookAppointment() {
  const button = $('#book-button');
  const facility = $('#facility-select').value;
  if (!facility) { showToast('Choose a PHC','Use Find PHC above before booking.','!'); return; }
  button.disabled = true; button.textContent = translate('Confirming…');
  try {
    const response = await fetch('/api/v1/appointments', {method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({facility,slot:state.selectedSlot})});
    const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'Booking failed');
    const booking=payload.data, confirmation=$('#booking-confirmation'); confirmation.hidden=false;
    confirmation.innerHTML=`<strong>Visit confirmed · Token ${escapeHTML(booking.tokenNumber)}</strong><br>${escapeHTML(state.selectedSlot)} at ${escapeHTML(facility)}`;
    showToast('Appointment confirmed',`Your token is ${booking.tokenNumber}.`); await fetchQueue();
  } catch (error) { showToast('Booking not saved',error.message || 'Please try again when connected.','!'); }
  finally { button.disabled=false; button.innerHTML=`${translate('Confirm appointment')} <span>→</span>`; }
}

function initRealtimeQueue() {
  if (typeof window.io !== 'function') return;
  try {
    state.socket = window.io({ reconnectionAttempts: 3, timeout: 4000 });
    state.socket.on('queue:update', applyQueue);
    state.socket.on('connect', updateConnectionState);
    state.socket.on('disconnect', updateConnectionState);
  } catch (error) {
    console.info('[queue] Offline fallback active.');
  }
}

async function fetchQueue() {
  try {
    const facility=$('#facility-select')?.value||''; const response = await fetch(`/api/v1/queue?facility=${encodeURIComponent(facility)}`,{credentials:'same-origin'});
    if (!response.ok) return;
    const payload = await response.json();
    applyQueue(payload.data);
  } catch (error) {
    console.info('[queue] Using local queue snapshot.');
  }
}

function applyQueue(queue) {
  if (!queue) return;
  if (queue.facility) $('#queue-facility').textContent = queue.facility;
  $('#now-serving').textContent = queue.nowServing || '—';
  if (Number.isFinite(queue.totalInQueue)) $('#queue-count').textContent = queue.totalInQueue;
  $('#queue-wait').textContent = Number.isFinite(queue.estimatedWaitMins) ? `${queue.estimatedWaitMins} min` : '—';
}

function selectConsultMode(mode) {
  state.consultMode = mode === 'audio' ? 'audio' : 'video';
  $$('[data-consult-mode]').forEach(button => button.classList.toggle('is-selected', button.dataset.consultMode === state.consultMode));
}

async function runDeviceCheck() {
  const networkText = navigator.onLine
    ? (state.language === 'hi' ? 'कनेक्शन अच्छा है' : state.language === 'mr' ? 'कनेक्शन चांगले आहे' : 'Connection looks good')
    : (state.language === 'hi' ? 'कम नेटवर्क—ऑडियो कॉल बेहतर रहेगा' : state.language === 'mr' ? 'कमी नेटवर्क—ऑडिओ कॉल अधिक योग्य' : 'Low connection—audio may work better');
  $('#network-check').textContent = networkText;
  showToast(translate('Device check'), networkText);
}

async function startConsultation() {
  const button = $('#start-consultation');
  const status = $('#consult-room-status');
  button.disabled = true;
  button.textContent = state.language === 'hi' ? 'सुरक्षित रूप से जोड़ा जा रहा है…' : state.language === 'mr' ? 'सुरक्षितपणे जोडत आहे…' : 'Connecting securely…';
  status.innerHTML = `<i></i> ${button.textContent}`;

  let mediaGranted = false;
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: state.consultMode === 'video' });
      mediaGranted = true;
      const video = $('#local-video');
      video.srcObject = state.mediaStream;
      video.hidden = state.consultMode !== 'video';
      $('#microphone-check').textContent = state.language === 'hi' ? 'माइक्रोफोन तैयार है' : state.language === 'mr' ? 'मायक्रोफोन तयार आहे' : 'Microphone is ready';
      $('#camera-check').textContent = state.consultMode === 'video'
        ? (state.language === 'hi' ? 'कैमरा तैयार है' : state.language === 'mr' ? 'कॅमेरा तयार आहे' : 'Camera is ready')
        : translate('Audio only');
      $$('#microphone-check, #camera-check').forEach(item => {
        const indicator = item.closest('.device-row').querySelector('.check-state');
        indicator.textContent = '✓';
        indicator.classList.remove('check-state--idle');
      });
    }
  } catch (error) {
    $('#microphone-check').textContent = state.language === 'hi' ? 'अनुमति नहीं मिली—डेमो जारी है' : state.language === 'mr' ? 'परवानगी मिळाली नाही—डेमो सुरू आहे' : 'Permission unavailable—demo continues';
  }

  setTimeout(() => {
    status.innerHTML = `<i></i> ${state.language === 'hi' ? 'डॉक्टर से जुड़े' : state.language === 'mr' ? 'डॉक्टरांशी जोडले' : 'Connected with doctor'}`;
    $('#call-controls').hidden = false;
    $('#consult-timer').hidden = false;
    button.hidden = true;
    $$('.mode-switch button').forEach(item => item.disabled = true);
    state.callSeconds = 0;
    updateCallTimer();
    state.callTimer = setInterval(updateCallTimer, 1000);
    showToast(
      state.language === 'hi' ? 'परामर्श शुरू हुआ' : state.language === 'mr' ? 'सल्ला सुरू झाला' : 'Consultation started',
      mediaGranted ? (state.language === 'hi' ? 'डॉक्टर से सुरक्षित कनेक्शन सक्रिय है।' : state.language === 'mr' ? 'डॉक्टरांशी सुरक्षित कनेक्शन सक्रिय आहे.' : 'Your secure doctor connection is active.') : (state.language === 'hi' ? 'डेमो मोड सक्रिय है।' : state.language === 'mr' ? 'डेमो मोड सक्रिय आहे.' : 'Demo mode is active.')
    );
  }, 700);
}

function updateCallTimer() {
  const minutes = String(Math.floor(state.callSeconds / 60)).padStart(2, '0');
  const seconds = String(state.callSeconds % 60).padStart(2, '0');
  $('#consult-timer').textContent = `${minutes}:${seconds}`;
  state.callSeconds += 1;
}

function toggleMicrophone() {
  const track = state.mediaStream?.getAudioTracks()[0];
  const button = $('#toggle-mic');
  if (track) track.enabled = !track.enabled;
  button.classList.toggle('is-off');
  $('small', button).textContent = button.classList.contains('is-off')
    ? (state.language === 'hi' ? 'अनम्यूट' : state.language === 'mr' ? 'अनम्यूट' : 'Unmute')
    : translate('Mute');
}

function toggleCamera() {
  const track = state.mediaStream?.getVideoTracks()[0];
  const button = $('#toggle-camera');
  if (track) track.enabled = !track.enabled;
  button.classList.toggle('is-off');
  $('#local-video').hidden = button.classList.contains('is-off') || !track;
  $('small', button).textContent = button.classList.contains('is-off')
    ? (state.language === 'hi' ? 'कैमरा चालू' : state.language === 'mr' ? 'कॅमेरा सुरू' : 'Camera on')
    : translate('Camera');
}

function endConsultation() {
  clearInterval(state.callTimer);
  state.callTimer = null;
  state.mediaStream?.getTracks().forEach(track => track.stop());
  state.mediaStream = null;
  const video = $('#local-video');
  video.srcObject = null;
  video.hidden = true;
  $('#call-controls').hidden = true;
  $('#consult-timer').hidden = true;
  $('#consult-room-status').innerHTML = `<i></i> ${translate('Ready to connect')}`;
  const button = $('#start-consultation');
  button.hidden = false;
  button.disabled = false;
  button.innerHTML = `${translate('Start consultation')} <span>→</span>`;
  $$('.mode-switch button').forEach(item => item.disabled = false);
  $('#toggle-mic').classList.remove('is-off');
  $('#toggle-camera').classList.remove('is-off');
  showToast(state.language === 'hi' ? 'परामर्श समाप्त' : state.language === 'mr' ? 'सल्ला समाप्त' : 'Consultation ended', state.language === 'hi' ? 'सारांश आपके स्वास्थ्य रिकॉर्ड में जोड़ा गया।' : state.language === 'mr' ? 'सारांश तुमच्या आरोग्य नोंदीत जोडला.' : 'A summary was added to your health records.');
}

function renderMedicines() {
  $('#medicine-list').innerHTML = medicines.map(item => `
    <div class="medicine-row">
      <div class="medicine-time"><strong>${item.time}</strong><small>${translate(item.phase)}</small></div>
      <span class="medicine-pill">◒</span>
      <div class="medicine-info"><strong>${item.name}</strong><small>${translate(item.note)}</small></div>
      <button class="dose-button${state.doses[item.id] ? ' is-taken' : ''}" data-dose="${item.id}">${translate(state.doses[item.id] ? '✓ Taken' : 'Mark taken')}</button>
    </div>`).join('');
  $$('[data-dose]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.dose;
    state.doses[id] = !state.doses[id];
    saveJSON('gac-doses', state.doses);
    renderMedicines();
    showToast(translate(state.doses[id] ? 'Dose recorded' : 'Dose marked incomplete'), medicines.find(item => item.id === id).name);
  }));
  const complete = Object.values(state.doses).filter(Boolean).length;
  const percent = medicines.length ? Math.round((complete / medicines.length) * 100) : 0;
  $('#dose-summary').textContent = medicines.length ? (state.language === 'hi' ? `${medicines.length} में से ${complete} लिया` : state.language === 'mr' ? `${medicines.length} पैकी ${complete} घेतले` : `${complete} of ${medicines.length} taken`) : 'No medicines added';
  $('#adherence-value').textContent = `${percent}%`;
  $('.adherence-ring').style.background = `conic-gradient(var(--green) 0 ${percent}%, #dce7e3 ${percent}% 100%)`;
}

function populateProfileForm() {
  $('#profile-name').value = state.profile.name;
  $('#profile-age').value = state.profile.age || '';
  $('#profile-blood').value = state.profile.bloodGroup || '';
  $('#profile-village').value = state.profile.village;
  $('#profile-conditions').value = state.profile.conditions;
  $('#profile-allergies').value = state.profile.allergies;
}

async function saveProfile(event) {
  event.preventDefault();
  state.profile = {
    ...state.profile,
    name: $('#profile-name').value.trim() || currentUser?.name || '',
    age: $('#profile-age').value ? Number($('#profile-age').value) : null,
    bloodGroup: $('#profile-blood').value,
    village: $('#profile-village').value.trim(),
    conditions: $('#profile-conditions').value.trim(),
    allergies: $('#profile-allergies').value.trim()
  };
  saveUserProfileCache();
  updateProfileUI();
  closeOverlay('profile');
  try {
    const response = await fetch('/api/v1/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state.profile) });
    if (!response.ok) throw new Error('Profile sync failed');
    showToast(translate('Profile updated'), translate('Your changes were securely synced.'));
  } catch (error) {
    showToast(translate('Saved on this device'), translate('Changes will sync when you are connected.'));
  }
}

function updateProfileUI() {
  $$('[data-user-name]').forEach(item => item.textContent = state.profile.name);
  const initials = String(state.profile.name || currentUser?.name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  $$('.avatar').forEach(item => item.textContent = initials || 'U');
  $('#record-conditions').textContent = translate(state.profile.conditions || 'None recorded');
  $('#record-allergies').textContent = translate(state.profile.allergies || 'None recorded');
  $('#record-blood').textContent = state.profile.bloodGroup || 'None recorded';
  const homeActive = $('[data-view="home"]').classList.contains('is-active');
  if (homeActive) $('#view-title').textContent = `${greeting()}, ${firstName(state.profile.name)}`;
}

async function dispatchSOS() {
  const button = $('#dispatch-sos');
  button.disabled = true;
  button.textContent = translate('Sending alert…');
  const locationData = await getCurrentLocation();
  let statusText = 'The nearest response team has been notified.';
  try {
    const response = await fetch('/api/v1/sos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientName: state.profile.name, location: locationData, emergencyType: 'Medical emergency' })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Dispatch failed');
    statusText = `${payload.data.assignedVehicle.vehicleId} is on the way. Estimated arrival: ${payload.data.etaMins} minutes.`;
  } catch (error) {
    statusText = 'Your alert is saved. Please call 108 immediately if the network is unavailable.';
  }
  $('#sos-status-text').textContent = statusText;
  $('#sos-ready').hidden = true;
  $('#sos-sent').hidden = false;
  button.disabled = false;
  button.textContent = translate('Send emergency alert');
}

function getCurrentLocation() {
  return new Promise(resolve => {
    const fallback = { lat: 18.5158, lng: 73.1822, address: state.profile.village || 'Vadgaon, Raigad' };
    if (!navigator.geolocation) return resolve(fallback);
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lng: position.coords.longitude, address: state.profile.village }),
      () => resolve(fallback),
      { enableHighAccuracy: false, timeout: 3500, maximumAge: 300000 }
    );
  });
}

async function syncOfflineRecords() {
  const button = $('#sync-button');
  const icon = $('#sync-icon');
  button.disabled = true;
  if (icon) icon.style.animation = 'loaderPulse .7s linear infinite';
  const records = [
    
    { patientName: 'Fatima Momin', visitDate: new Date().toISOString(), type: 'Infant vaccination' }
  ];
  try {
    const response = await fetch('/api/v1/sync/asha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: 'asha-vadgaon-01', records }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || 'Sync failed');
    $('#offline-count').textContent = '0';
    button.innerHTML = `<span id="sync-icon">✓</span> ${translate('Records synced')}`;
    const syncMessage = state.language === 'hi' ? `${payload.data.recordsProcessed} रिकॉर्ड PHC तक पहुँचे।` : state.language === 'mr' ? `${payload.data.recordsProcessed} नोंदी PHC पर्यंत पोहोचल्या.` : `${payload.data.recordsProcessed} records reached the PHC.`;
    showToast(translate('Sync complete'), syncMessage);
  } catch (error) {
    showToast(translate('Still saved offline'), translate('We’ll retry when the connection improves.'), '!');
    button.innerHTML = `<span id="sync-icon">↻</span> ${translate('Retry sync')}`;
  } finally {
    button.disabled = false;
    const currentIcon = $('#sync-icon');
    if (currentIcon) currentIcon.style.animation = '';
  }
}

function sendChat(event) {
  event.preventDefault();
  const input = $('#chat-input');
  const message = input.value.trim();
  if (!message) return;
  appendChat(message, 'user');
  input.value = '';
  setTimeout(() => answerAssistant(message), 350);
}

function answerAssistant(message) {
  const lower = message.toLowerCase();
  const answers = {
    en: {
      general: 'I can help you check symptoms, book a PHC visit, track medicines, or understand your health records.',
      bp: 'I do not have a recorded blood-pressure reading for you here. If you enter or receive a BP reading from your care team, I can help explain what the numbers mean.',
      booking: 'I’ll take you to appointments. Choose a facility, date, and time, then confirm your live token.',
      medicine: 'No medicines are currently prescribed. Medicines will appear here only after a consultation and prescription from your care team.'
    },
    hi: {
      general: 'मैं लक्षण जाँचने, PHC अपॉइंटमेंट लेने, दवाइयाँ ट्रैक करने या स्वास्थ्य रिकॉर्ड समझने में मदद कर सकती हूँ।',
      bp: 'यहाँ आपका कोई रक्तचाप रिकॉर्ड नहीं है। देखभाल टीम से मिली या दर्ज की गई रीडिंग के बारे में मैं समझाने में मदद कर सकती हूँ।',
      booking: 'मैं आपको अपॉइंटमेंट पेज पर ले चलती हूँ। केंद्र, तारीख और समय चुनकर लाइव टोकन पक्का करें।',
      medicine: 'अभी कोई दवा निर्धारित नहीं है। परामर्श और देखभाल टीम के पर्चे के बाद ही दवाइयाँ यहाँ दिखाई देंगी।'
    },
    mr: {
      general: 'मी लक्षणे तपासणे, PHC भेट बुक करणे, औषधे नोंदवणे किंवा आरोग्य नोंदी समजून घेण्यात मदत करू शकते.',
      bp: 'इथे तुमची रक्तदाबाची नोंद उपलब्ध नाही. काळजी पथकाकडून मिळालेली किंवा नोंदवलेली रीडिंग समजावून सांगण्यास मी मदत करू शकते.',
      booking: 'मी तुम्हाला भेटीच्या पृष्ठावर नेते. केंद्र, तारीख आणि वेळ निवडून लाईव्ह टोकन निश्चित करा.',
      medicine: 'सध्या कोणतीही औषधे निर्धारित केलेली नाहीत. सल्लामसलत आणि आरोग्य टीमच्या प्रिस्क्रिप्शननंतरच औषधे येथे दिसतील.'
    }
  };
  let answer = answers[state.language].general;
  if (/bp|pressure|रक्तदाब/.test(lower)) answer = answers[state.language].bp;
  else if (/book|visit|appointment|भेट/.test(lower)) answer = answers[state.language].booking;
  else if (/medicine|dose|दवा|औषध/.test(lower)) answer = answers[state.language].medicine;
  appendChat(answer, 'guide');
  if (/book|visit|appointment|भेट/.test(lower)) setTimeout(() => navigate('appointments'), 650);
}

function appendChat(message, role) {
  const log = $('#chat-log');
  const node = document.createElement('div');
  node.className = `chat-message chat-message--${role}`;
  node.textContent = message;
  log.appendChild(node);
  log.scrollTop = log.scrollHeight;
}

function captureStaticText() {
  const roots = [$('#app-loader'), $('#app'), $('#profile-modal'), $('#sos-modal'), $('#location-modal'), $('#assistant-drawer'), $('#toast')].filter(Boolean);
  staticTextNodes = [];
  roots.forEach(root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const value = node.nodeValue;
      const trimmed = value.trim();
      if (!trimmed || ['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) continue;
      staticTextNodes.push({ node, original: trimmed, before: value.match(/^\s*/)[0], after: value.match(/\s*$/)[0] });
    }
  });
}

function translate(text, language = state.language) {
  if (language === 'en') return text;
  const entry = phraseBook[text];
  if (!entry) return text;
  return entry[language === 'hi' ? 0 : 1];
}

function applyLanguage(language) {
  state.language = languageConfig[language] ? language : 'en';
  localStorage.setItem('gac-language', state.language);
  $('#language-select').value = state.language;
  document.documentElement.lang = state.language;
  staticTextNodes.forEach(item => {
    if (item.node.isConnected) item.node.nodeValue = `${item.before}${translate(item.original)}${item.after}`;
  });
  $('#symptom-details').placeholder = state.language === 'hi' ? 'उदाहरण: यह दो दिन पहले शुरू हुआ…' : state.language === 'mr' ? 'उदाहरण: हे दोन दिवसांपूर्वी सुरू झाले…' : 'For example: It started two days ago…';
  $('#chat-input').placeholder = state.language === 'hi' ? 'अपना सवाल लिखें…' : state.language === 'mr' ? 'तुमचा प्रश्न लिहा…' : 'Type your question…';
  renderSymptoms();
  renderDates();
  renderMedicines();
  updateConnectionState();
  updateProfileUI();
  updateSidebarTooltips();
  applySidebarState();
  navigate(location.hash.replace('#', '') || 'home', false);
}

function updateConnectionState() {
  const online = navigator.onLine;
  const pill = $('#connection-pill');
  pill.classList.toggle('is-offline', !online);
  $('span', pill).textContent = online ? languageConfig[state.language].connected : languageConfig[state.language].offline;
}

let toastTimer;
function showToast(title, message, icon = '✓') {
  clearTimeout(toastTimer);
  $('#toast-title').textContent = title;
  $('#toast-message').textContent = message;
  $('#toast-icon').textContent = icon;
  $('#toast').classList.add('is-visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 3500);
}

function greeting() {
  const hour = new Date().getHours();
  if (state.language === 'hi') return hour < 12 ? 'सुप्रभात' : hour < 17 ? 'नमस्कार' : 'शुभ संध्या';
  if (state.language === 'mr') return hour < 12 ? 'शुभ सकाळ' : hour < 17 ? 'नमस्कार' : 'शुभ संध्याकाळ';
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
}

function firstName(name) { return String(name || '').trim().split(/\s+/)[0] || 'there'; }
function joinWords(words) { const joiner = state.language === 'hi' ? ' और ' : state.language === 'mr' ? ' आणि ' : ' and '; return words.length > 1 ? `${words.slice(0, -1).join(', ')}${joiner}${words.at(-1)}` : words[0] || ''; }
function escapeHTML(value) { const node = document.createElement('span'); node.textContent = String(value ?? ''); return node.innerHTML; }
function loadJSON(key, fallback) { try { return { ...fallback, ...JSON.parse(localStorage.getItem(key)) }; } catch { return { ...fallback }; } }
function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage is optional */ } }

// --- v1.4 account + location services ---
const phcDirectory = []; // No demo facilities: nearby PHCs come from the live facility lookup.
let authMode = 'login';
let currentUser = null;
function userCacheKey(){ return currentUser?.patientId ? `gac-profile:${currentUser.patientId}` : null; }
function loadUserProfileCache(){ const key=userCacheKey(); state.profile=key?loadJSON(key, {...defaultProfile,name:currentUser?.name||''}):{...defaultProfile}; }
function saveUserProfileCache(){ const key=userCacheKey(); if(key) saveJSON(key,state.profile); }


function applyRoleUI(){
  const isAsha=currentUser?.role==='asha';
  $$('.asha-only').forEach(el=>el.hidden=!isAsha);
  if(!isAsha && location.hash==='#worker') navigate('home');
}
async function loadAshaPatients(){
  if(currentUser?.role!=='asha') return;
  const list=$('#asha-patient-list'); if(!list)return; list.innerHTML='<div class="empty-state">Loading patients…</div>';
  try{const r=await fetch('/api/v1/asha/patients',{credentials:'same-origin'});const p=await r.json();if(!r.ok)throw new Error(p.message||'Could not load patients'); const rows=p.data||[];
    list.innerHTML=rows.length?rows.map(x=>`<button type="button" class="visit-row asha-patient-button" data-asha-patient="${escapeHTML(x.patientId)}"><span class="avatar">${escapeHTML((x.name||'P').split(/\s+/).slice(0,2).map(v=>v[0]).join('').toUpperCase())}</span><div><strong>${escapeHTML(x.name)}</strong><small>${escapeHTML(x.village||'Village not added')}</small></div><span>${escapeHTML(x.primaryHealthCenter||'PHC not selected')}</span><span>Open →</span></button>`).join(''):'<div class="empty-state">No patient accounts yet.</div>';
    $$('[data-asha-patient]',list).forEach(b=>b.addEventListener('click',()=>showAshaPatient(rows.find(x=>x.patientId===b.dataset.ashaPatient))));
  }catch(e){list.innerHTML=`<div class="empty-state">${escapeHTML(e.message)}</div>`;}
}
function showAshaPatient(x){if(!x)return;const box=$('#asha-patient-record');box.hidden=false;box.innerHTML=`<div class="panel__header"><div><p>PATIENT RECORD</p><h3>${escapeHTML(x.name)}</h3></div></div><div class="asha-record-grid"><div><small>Patient ID</small><strong>${escapeHTML(x.patientId)}</strong></div><div><small>Age</small><strong>${escapeHTML(x.age||'Not added')}</strong></div><div><small>Blood group</small><strong>${escapeHTML(x.bloodGroup||'Not added')}</strong></div><div><small>Village</small><strong>${escapeHTML(x.village||'Not added')}</strong></div><div><small>Conditions</small><strong>${escapeHTML((x.conditions||[]).join(', ')||'None recorded')}</strong></div><div><small>Allergies</small><strong>${escapeHTML((x.allergies||[]).join(', ')||'None recorded')}</strong></div><div><small>PHC</small><strong>${escapeHTML(x.primaryHealthCenter||'Not selected')}</strong></div></div>`;box.scrollIntoView({behavior:'smooth',block:'start'});}

async function initAccount() {
  bindAccountUI();
  // Always require an explicit login when the app/site is opened, even if an old session cookie exists.
  // Only the login ID may be remembered locally; passwords are never stored by the app.
  const remembered = loadJSON('gac-login-hint', null);
  if (remembered?.loginId) $('#auth-login').value = remembered.loginId;
  $('#auth-remember').checked = Boolean(remembered?.loginId);
  showAuth();
}
function bindAccountUI(){
  $('#auth-form')?.addEventListener('submit', submitAuth);
  $('#auth-switch')?.addEventListener('click',()=>{authMode=authMode==='login'?'register':'login'; const reg=authMode==='register'; $('#auth-name-field').hidden=!reg; $('#auth-role-field').hidden=!reg; $('#auth-title').textContent=reg?'Create your account':'Welcome back'; $('#auth-subtitle').textContent=reg?'Your health information will be linked to this account.':'Log in to continue to Gram Arogya Connect.'; $('#auth-submit').textContent=reg?'Create account':'Log in'; $('#auth-switch').textContent=reg?'Already have an account? Log in':'New user? Create account'; $('#auth-password').autocomplete=reg?'new-password':'current-password'; $('#auth-error').textContent='';});
  $('#location-button')?.addEventListener('click',()=>openModal('location'));
  $('#detect-location')?.addEventListener('click',detectAndSuggestPhc);
}
function showAuth(){ $('#auth-screen').hidden=false; document.body.style.overflow='hidden'; }
function hideAuth(){ $('#auth-screen').hidden=true; document.body.style.overflow=''; }
async function submitAuth(event){
  event.preventDefault(); const button=$('#auth-submit'); const error=$('#auth-error'); error.textContent=''; button.disabled=true;
  const body={loginId:$('#auth-login').value.trim(),password:$('#auth-password').value,remember:$('#auth-remember').checked};
  if(authMode==='register'){ body.name=$('#auth-name').value.trim(); body.role=document.querySelector('input[name="auth-role"]:checked')?.value||'patient'; }
  try{
    const mode=authMode;
    const response=await fetch(`/api/v1/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
    const payload=await response.json(); if(!response.ok)throw new Error(payload.message||'Could not continue');
    if(body.remember) saveJSON('gac-login-hint',{loginId:body.loginId}); else localStorage.removeItem('gac-login-hint');
    if(mode==='register'){
      // Registration creates the account, but app access still requires a deliberate login.
      await fetch('/api/v1/auth/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});
      currentUser=null; authMode='login'; $('#auth-name-field').hidden=true; $('#auth-role-field').hidden=true; $('#auth-title').textContent='Account created';
      $('#auth-subtitle').textContent='Log in with the account you just created to enter Gram Arogya Connect.'; $('#auth-submit').textContent='Log in';
      $('#auth-switch').textContent='New user? Create account'; $('#auth-password').value=''; $('#auth-password').autocomplete='current-password';
      error.textContent='Account saved. Please log in to continue.'; return;
    }
    currentUser=payload.data; loadUserProfileCache(); applyRoleUI(); hideAuth(); await loadServerProfile(); applyUserLocation(); if(currentUser?.role==='asha') await loadAshaPatients(); await fetchQueue();
  } catch(e){error.textContent=e.message;} finally{button.disabled=false;}
}
async function loadServerProfile(){try{const r=await fetch('/api/v1/profile',{credentials:'same-origin'});if(!r.ok)return;const p=await r.json();if(p.data){state.profile={...state.profile,...p.data,conditions:Array.isArray(p.data.chronicConditions)?p.data.chronicConditions.join(', '):(p.data.conditions||state.profile.conditions),allergies:Array.isArray(p.data.allergies)?p.data.allergies.join(', '):(p.data.allergies||state.profile.allergies)};saveUserProfileCache();updateProfileUI();}}catch{}}
function distanceKm(a,b){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);const q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
function detectPreciseLocation(){return new Promise((resolve,reject)=>{if(!navigator.geolocation)return reject(new Error('Location is not supported on this device.'));navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy}),()=>reject(new Error('Location permission was not granted. You can still choose a PHC manually.')),{enableHighAccuracy:true,timeout:10000,maximumAge:120000});});}
async function detectAndSuggestPhc(){const status=$('#location-status'),button=$('#detect-location');button.disabled=true;status.textContent='Detecting your location…';try{const loc=await detectPreciseLocation();let choices=[];try{const r=await fetch(`/api/v1/facilities/nearby?lat=${encodeURIComponent(loc.lat)}&lng=${encodeURIComponent(loc.lng)}`,{credentials:'same-origin'});const payload=await r.json();if(r.ok)choices=payload.data||[];}catch{} if(!choices.length){status.textContent='Location found, but no nearby PHC results are available right now. Please try again when connected.';renderPhcs([],loc);return;} status.textContent=`Location found (about ${Math.round(loc.accuracy||0)} m accuracy). Choose a suggested facility:`;renderPhcs(choices,loc);}catch(e){status.textContent=e.message;renderPhcs([],null);}finally{button.disabled=false;}}
function renderPhcs(list,loc){const box=$('#phc-options');box.innerHTML=list.map((p,i)=>`<button class="phc-option" type="button" data-phc="${p.id}"><strong>${i===0&&loc?'Nearest suggestion · ':''}${escapeHTML(p.name)}</strong><small>${p.distanceKm==null?'Select facility':`${p.distanceKm.toFixed(1)} km away`}</small></button>`).join('');$$('[data-phc]',box).forEach(btn=>btn.addEventListener('click',()=>selectPhc(list.find(p=>p.id===btn.dataset.phc),loc)));}
async function selectPhc(phc,loc){if(!phc)return;try{{await fetch('/api/v1/auth/location',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({...loc,selectedPhc:phc})});}currentUser={...(currentUser||{}),location:loc,selectedPhc:phc};state.profile.primaryHealthCenter=phc.name;saveUserProfileCache();$('#facility-select').value=phc.name;if(!$('#facility-select').value){const o=document.createElement('option');o.textContent=phc.name;$('#facility-select').prepend(o);$('#facility-select').value=phc.name;}applyUserLocation();closeOverlay('location');showToast('PHC selected',phc.name);}catch{showToast('Could not save PHC','Please try again when connected.','!');}}
function applyUserLocation(){const p=currentUser?.selectedPhc;if(p){$('#location-label').textContent=p.name.replace(/^PHC\s*/,'').slice(0,20);$('#location-button').title=`Selected: ${p.name}`;}}
if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
