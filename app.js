(() => {
  'use strict';

  const KEYS = {
    users: 'optimum_users_v1',
    courses: 'optimum_courses_v1',
    teachers: 'optimum_teachers_v1',
    announcements: 'optimum_announcements_v1',
    tests: 'optimum_tests_v1',
    enrollments: 'optimum_enrollments_v1',
    password: 'optimum_admin_password_v1',
    currentUser: 'optimum_current_user_v1'
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const read = (key, fallback = []) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null ? fallback : value;
    } catch { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
  const safeURL = value => {
    if (!value) return '';
    try {
      const url = new URL(value, location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const placeholderImage = (label = 'Optimum') => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="420"><rect width="100%" height="100%" fill="#191919"/><circle cx="350" cy="160" r="65" fill="#FFD700"/><text x="350" y="182" font-size="70" font-family="Arial" font-weight="bold" text-anchor="middle" fill="#111">O</text><text x="350" y="290" font-size="28" font-family="Arial" text-anchor="middle" fill="#f5f5f5">${String(label).replace(/[<>&]/g,'')}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };
  const formatDate = value => {
    try { return new Intl.DateTimeFormat('uz-UZ', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(value)); }
    catch { return '—'; }
  };
  const getUsers = () => read(KEYS.users);
  const getCourses = () => read(KEYS.courses);
  const getTeachers = () => read(KEYS.teachers);
  const getAnnouncements = () => read(KEYS.announcements);
  const getTests = () => read(KEYS.tests);
  const getEnrollments = () => read(KEYS.enrollments);
  const getPassword = () => localStorage.getItem(KEYS.password) || '3227';
  let activeQuizId = null;
  let questionCount = 0;

  function toast(message, type = 'success') {
    const region = $('#toastRegion');
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    node.textContent = message;
    region.appendChild(node);
    setTimeout(() => node.remove(), 3800);
  }
  function showModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    const first = $('input,button', modal);
    if (first) setTimeout(() => first.focus(), 40);
  }
  function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
    if (!$('.modal-backdrop:not(.hidden)')) document.body.classList.remove('modal-open');
  }
  function empty(id, show) { const node = document.getElementById(id); if (node) node.classList.toggle('hidden', !show); }

  function initSeedData() {
    if (!localStorage.getItem(KEYS.courses)) write(KEYS.courses, [
      {id:uid(),title:'Frontend dasturlash',description:'HTML, CSS va JavaScript orqali zamonaviy, moslashuvchan web-saytlar yaratishni o‘rganing.',duration:'4 oy',price:'450 000 so‘m/oy',image:''},
      {id:uid(),title:'Ingliz tili',description:'Kundalik muloqot, grammatika va xalqaro imtihonlarga tayyorgarlik uchun mustahkam poydevor.',duration:'6 oy',price:'350 000 so‘m/oy',image:''},
      {id:uid(),title:'Matematika',description:'Mantiqiy fikrlashni rivojlantiring va murakkab masalalarni bosqichma-bosqich yeching.',duration:'4 oy',price:'300 000 so‘m/oy',image:''}
    ]);
    if (!localStorage.getItem(KEYS.teachers)) write(KEYS.teachers, [
      {id:uid(),name:'Tajribali ustoz',subject:'Frontend dasturlash',bio:'Amaliy loyihalar orqali bilim berish va o‘quvchilarni mustaqil ishlashga yo‘naltirish.',image:''},
      {id:uid(),name:'Malakali mutaxassis',subject:'Ingliz tili',bio:'Til o‘rganishda ishonch, muntazam mashq va natijaga yo‘naltirilgan yondashuv.',image:''}
    ]);
    if (!localStorage.getItem(KEYS.announcements)) write(KEYS.announcements, [
      {id:uid(),title:'Optimumga xush kelibsiz!',text:'Yangi maqsadlar sari ilk qadamni biz bilan boshlang. Kurslarimiz bilan tanishing va o‘zingizga mos yo‘nalishni tanlang.',image:'',link:'',createdAt:new Date().toISOString()}
    ]);
    if (!localStorage.getItem(KEYS.tests)) write(KEYS.tests, [
      {id:uid(),title:'Web asoslari',questions:[
        {text:'HTML nimaga xizmat qiladi?',options:['Sahifa tuzilmasini yaratish','Ma’lumotlar bazasini boshqarish','Faqat animatsiya qilish','Operatsion tizim yaratish'],correct:0,points:2},
        {text:'CSS ning asosiy vazifasi nima?',options:['Serverni ishga tushirish','Sahifa ko‘rinishini bezash','Fayllarni siqish','Dastur kodini kompilyatsiya qilish'],correct:1,points:2},
        {text:'JavaScript ko‘pincha nima uchun ishlatiladi?',options:['Sahifaga interaktivlik qo‘shish','Faqat rasm chizish','Kompyuterni yig‘ish','Internet tezligini oshirish'],correct:0,points:3}
      ]}
    ]);
    [KEYS.users, KEYS.enrollments].forEach(key => { if (!localStorage.getItem(key)) write(key, []); });
  }

  function renderCourses() {
    const grid = $('#coursesGrid'), courses = getCourses();
    grid.innerHTML = courses.map((course, index) => {
      const img = safeURL(course.image) || placeholderImage('Optimum kurs');
      return `<article class="course-card">
        <div class="course-image"><img src="${img}" alt="${escapeHTML(course.title)}" loading="lazy" onerror="this.src='${placeholderImage('Optimum')}'"><span class="card-number">KURS ${String(index+1).padStart(2,'0')}</span></div>
        <div class="course-body"><span class="card-kicker">OPTIMUM ACADEMY</span><h3>${escapeHTML(course.title)}</h3><p>${escapeHTML(course.description)}</p>
        <div class="course-meta"><span>◷ ${escapeHTML(course.duration || 'Moslashuvchan')}</span><strong>${escapeHTML(course.price || 'Narx kelishiladi')}</strong></div>
        <div class="enroll-control" data-course-id="${escapeHTML(course.id)}"><button class="course-enroll" data-enroll-start="${escapeHTML(course.id)}">Kursga yozilish <span>↗</span></button></div></div>
      </article>`;
    }).join('');
    empty('coursesEmpty', courses.length === 0);
  }
  function renderTeachers() {
    const teachers = getTeachers();
    $('#teachersGrid').innerHTML = teachers.map((teacher, index) => {
      const img = safeURL(teacher.image) || placeholderImage('Ustoz');
      return `<article class="teacher-card"><div class="teacher-image"><img src="${img}" alt="${escapeHTML(teacher.name)}" loading="lazy" onerror="this.src='${placeholderImage('Ustoz')}'"></div><div class="teacher-body"><span class="card-kicker">USTOZ ${String(index+1).padStart(2,'0')}</span><h3>${escapeHTML(teacher.name)}</h3><p><b>${escapeHTML(teacher.subject)}</b><br>${escapeHTML(teacher.bio || 'Bilim va tajriba ulashishga tayyor.')}</p></div></article>`;
    }).join('');
    empty('teachersEmpty', teachers.length === 0);
  }
  function renderAnnouncements() {
    const items = getAnnouncements();
    $('#announcementsGrid').innerHTML = items.map(item => {
      const img = safeURL(item.image) || placeholderImage('E’lon');
      const link = safeURL(item.link);
      return `<article class="announcement-card"><div class="announcement-image"><img src="${img}" alt="${escapeHTML(item.title)}" loading="lazy" onerror="this.src='${placeholderImage('E’lon')}'"></div><div class="announcement-body"><span class="date-label">${formatDate(item.createdAt || Date.now())}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.text)}</p>${link ? `<a class="announcement-link" href="${link}" target="_blank" rel="noopener noreferrer">Batafsil ko'rish ↗</a>` : ''}</div></article>`;
    }).join('');
    empty('announcementsEmpty', items.length === 0);
  }
  function renderTests() {
    const tests = getTests();
    $('#testsGrid').innerHTML = tests.map(test => {
      const total = test.questions.reduce((sum, q) => sum + Number(q.points || 1), 0);
      return `<article class="test-item"><div><h3>${escapeHTML(test.title)}</h3><p>${test.questions.length} ta savol · ${total} ballgacha</p></div><button class="test-open" data-open-test="${escapeHTML(test.id)}">Testni boshlash →</button></article>`;
    }).join('');
    empty('testsEmpty', tests.length === 0);
  }
  function renderSite() { renderCourses(); renderTeachers(); renderAnnouncements(); renderTests(); }

  function renderAdmin() {
    const users = getUsers(), courses = getCourses(), teachers = getTeachers(), enrollments = getEnrollments();
    $('#metricUsers').textContent = users.length;
    $('#metricCourses').textContent = courses.length;
    $('#metricTeachers').textContent = teachers.length;
    $('#metricEnrollments').textContent = enrollments.length;
    $('#userCountBadge').textContent = users.length;
    $('#enrollmentCountBadge').textContent = enrollments.length;
    $('#usersTableBody').innerHTML = users.map((u,i)=>`<tr><td>${i+1}</td><td>${escapeHTML(u.firstName)}</td><td>${escapeHTML(u.lastName)}</td><td>${escapeHTML(u.phone)}</td><td>${formatDate(u.createdAt)}</td></tr>`).join('');
    empty('usersEmpty', users.length === 0);
    $('#adminCoursesCount').textContent = `${courses.length} ta kurs`;
    $('#adminCoursesList').innerHTML = courses.map(c=>manageItem(c.title, `${c.duration || 'Davomiylik ko‘rsatilmagan'} · ${c.price || 'Narx belgilanmagan'}`, c.image, 'course', c.id)).join('') || '<p class="fine-print">Kurslar mavjud emas.</p>';
    $('#adminTeachersList').innerHTML = teachers.map(t=>manageItem(t.name, t.subject, t.image, 'teacher', t.id)).join('') || '<p class="fine-print">Ustozlar mavjud emas.</p>';
    $('#adminAnnouncementsList').innerHTML = getAnnouncements().map(a=>manageItem(a.title, a.text, a.image, 'announcement', a.id)).join('') || '<p class="fine-print">E’lonlar mavjud emas.</p>';
    $('#adminTestsList').innerHTML = getTests().map(t=>manageItem(t.title, `${t.questions.length} savol · ${t.questions.reduce((s,q)=>s+Number(q.points||1),0)} ball`, '', 'test', t.id)).join('') || '<p class="fine-print">Testlar mavjud emas.</p>';
    $('#enrollmentsTableBody').innerHTML = enrollments.slice().reverse().map(e=>`<tr><td>${escapeHTML(e.firstName)} ${escapeHTML(e.lastName)}</td><td>${escapeHTML(e.phone)}</td><td>${escapeHTML(e.courseTitle)}</td><td>${formatDate(e.createdAt)}</td><td><span class="status-pill">Yuborildi</span></td></tr>`).join('');
    empty('enrollmentsEmpty', enrollments.length === 0);
    const recent = enrollments.slice().reverse().slice(0,5);
    $('#recentEnrollments').innerHTML = recent.length ? `<div class="manage-list">${recent.map(e=>`<div class="manage-item"><div class="manage-thumb">↗</div><div class="manage-info"><strong>${escapeHTML(e.firstName)} ${escapeHTML(e.lastName)} — ${escapeHTML(e.courseTitle)}</strong><small>${escapeHTML(e.phone)} · ${formatDate(e.createdAt)}</small></div></div>`).join('')}</div>` : '<p class="fine-print">Hali yozilish so‘rovlari kelmagan.</p>';
  }
  function manageItem(title, detail, image, type, id) {
    const img = safeURL(image);
    return `<div class="manage-item"><div class="manage-thumb">${img ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : 'O.'}</div><div class="manage-info"><strong>${escapeHTML(title)}</strong><small>${escapeHTML(detail)}</small></div><button class="delete-btn" data-delete-type="${type}" data-delete-id="${escapeHTML(id)}">O'chirish</button></div>`;
  }

  function openAdmin() {
    hideModal('adminLoginModal');
    $('#adminPanel').classList.remove('hidden');
    document.body.classList.add('modal-open');
    switchAdminTab('dashboard');
    renderAdmin();
  }
  function closeAdmin() {
    $('#adminPanel').classList.add('hidden');
    if (!$('.modal-backdrop:not(.hidden)')) document.body.classList.remove('modal-open');
  }
  const tabTitles = {dashboard:'Umumiy ko‘rinish',users:'Foydalanuvchilar',courses:'Kurslar boshqaruvi',teachers:'Ustozlar boshqaruvi',announcements:'E’lonlar boshqaruvi',tests:'Testlar boshqaruvi',enrollments:'Kursga yozilganlar',settings:'Sozlamalar'};
  function switchAdminTab(tab) {
    $$('.admin-nav').forEach(b=>b.classList.toggle('active', b.dataset.adminTab === tab));
    $$('.admin-tab').forEach(s=>s.classList.toggle('active', s.id === `admin-${tab}`));
    $('#adminPageTitle').textContent = tabTitles[tab] || 'Admin panel';
    if (tab === 'tests' && !$('#questionBuilder').children.length) addQuestion();
    renderAdmin();
  }

  function addQuestion() {
    questionCount++;
    const index = questionCount;
    const node = document.createElement('div');
    node.className = 'question-builder-item';
    node.dataset.questionIndex = index;
    node.innerHTML = `<div class="question-builder-head"><strong>Savol ${$('#questionBuilder').children.length + 1}</strong><button class="delete-btn" type="button" data-remove-question="${index}">O'chirish</button></div>
      <label>Savol matni<input data-q-text required maxlength="300" placeholder="Savolni kiriting"></label>
      <div class="option-fields">
        <label>A varianti<input data-option="0" required maxlength="180" placeholder="A javobi"></label>
        <label>B varianti<input data-option="1" required maxlength="180" placeholder="B javobi"></label>
        <label>C varianti<input data-option="2" required maxlength="180" placeholder="C javobi"></label>
        <label>D varianti<input data-option="3" required maxlength="180" placeholder="D javobi"></label>
      </div>
      <div class="form-two"><label>To'g'ri javob<select data-correct style="padding:10px;border:1px solid #ddd;border-radius:8px;background:#fafafa"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label><label>Ball<input data-points type="number" min="1" max="100" value="1" required></label></div>`;
    $('#questionBuilder').appendChild(node);
  }
  function submitEnrollment(courseId) {
    const user = read(KEYS.currentUser, null);
    if (!user) { showModal('registrationModal'); toast("Davom etish uchun avval ro'yxatdan o'ting.", 'error'); return; }
    const course = getCourses().find(c => c.id === courseId);
    if (!course) { toast("Bu kurs topilmadi. Sahifani yangilang.", 'error'); return; }
    const enrollments = getEnrollments();
    if (enrollments.some(e => e.userId === user.id && e.courseId === courseId)) {
      toast("Siz bu kursga avval yozilgansiz.", 'error'); return;
    }
    enrollments.push({id:uid(),userId:user.id,firstName:user.firstName,lastName:user.lastName,phone:user.phone,courseId:course.id,courseTitle:course.title,createdAt:new Date().toISOString()});
    write(KEYS.enrollments, enrollments);
    toast(`Tabriklaymiz! "${course.title}" kursiga yozilish so'rovingiz saqlandi.`);
    renderAdmin();
  }

  function openQuiz(testId) {
    const test = getTests().find(t=>t.id === testId);
    if (!test) return;
    activeQuizId = testId;
    const total = test.questions.reduce((sum,q)=>sum+Number(q.points||1),0);
    $('#testModalContent').innerHTML = `<p class="eyebrow">OPTIMUM · BILIM SINOVI</p><h2 id="testModalTitle">${escapeHTML(test.title)}</h2><p class="muted">${test.questions.length} ta savol · ${total} ballgacha</p>
      <form id="quizForm">${test.questions.map((q,i)=>`<div class="quiz-question"><h3>${i+1}. ${escapeHTML(q.text)} <span style="color:#d8bb00;font-size:10px">(${Number(q.points||1)} ball)</span></h3>${q.options.map((option,j)=>`<label class="quiz-option"><input type="radio" name="question-${i}" value="${j}" required><span>${String.fromCharCode(65+j)}. ${escapeHTML(option)}</span></label>`).join('')}</div>`).join('')}
      <button class="btn btn-yellow full-width" type="submit">Natijani tekshirish →</button></form><div id="quizResult"></div>`;
    showModal('testModal');
  }
  function scoreQuiz(form) {
    const test = getTests().find(t=>t.id === activeQuizId);
    if (!test) return;
    const data = new FormData(form);
    let score = 0, max = 0;
    test.questions.forEach((q,i)=>{ const points = Number(q.points||1); max += points; if (Number(data.get(`question-${i}`)) === Number(q.correct)) score += points; });
    const percent = max ? Math.round(score/max*100) : 0;
    $('#quizResult').innerHTML = `<div class="quiz-result"><p class="eyebrow">TEST YAKUNLANDI</p><strong>${score} / ${max} ball</strong><p style="font-size:12px;color:#bbb;margin:8px 0 0">Natija: ${percent}%. ${percent >= 80 ? 'Ajoyib natija! Barakalla.' : percent >= 50 ? 'Yaxshi urinish. Yana mashq qilib ko‘ring.' : 'Mavzularni qayta ko‘rib, yana urinib ko‘ring.'}</p></div><button type="button" class="btn btn-ghost full-width" id="quizCloseResult">Yopish</button>`;
    $('#quizCloseResult').addEventListener('click',()=>hideModal('testModal'));
    $('#quizForm').classList.add('hidden');
  }

  function initEvents() {
    $('#year').textContent = new Date().getFullYear();
    $('#menuToggle').addEventListener('click', () => {
      const open = $('#navLinks').classList.toggle('open');
      $('#menuToggle').setAttribute('aria-expanded', String(open));
    });
    $$('#navLinks a').forEach(a=>a.addEventListener('click',()=>$('#navLinks').classList.remove('open')));
    $('#openAdminBtn').addEventListener('click',()=>showModal('adminLoginModal'));
    $('#closeAdminBtn').addEventListener('click',closeAdmin);
    $$('[data-close]').forEach(btn=>btn.addEventListener('click',()=>hideModal(btn.dataset.close)));
    $$('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',e=>{if(e.target===backdrop)hideModal(backdrop.id)}));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){ $$('.modal-backdrop:not(.hidden)').forEach(m=>hideModal(m.id)); closeAdmin(); }});

    $('#registrationForm').addEventListener('submit', e=>{
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      const firstName = String(form.get('firstName')||'').trim();
      const lastName = String(form.get('lastName')||'').trim();
      const phone = String(form.get('phone')||'').trim();
      if (!firstName || !lastName || phone.replace(/\D/g,'').length < 7) { toast("Ism, familiya va to'g'ri telefon raqamini kiriting.",'error'); return; }
      const users = getUsers();
      const existing = users.find(u=>u.phone.replace(/\D/g,'') === phone.replace(/\D/g,''));
      const user = existing || {id:uid(),firstName,lastName,phone,createdAt:new Date().toISOString()};
      if (!existing) { users.push(user); write(KEYS.users,users); }
      else { user.firstName=firstName; user.lastName=lastName; user.phone=phone; write(KEYS.users,users.map(u=>u.id===user.id?user:u)); }
      write(KEYS.currentUser,user);
      hideModal('registrationModal');
      toast(`Xush kelibsiz, ${firstName}!`);
      renderAdmin();
    });

    $('#adminLoginForm').addEventListener('submit',e=>{
      e.preventDefault();
      const password = new FormData(e.currentTarget).get('password');
      if (password === getPassword()) { $('#adminLoginError').classList.add('hidden'); e.currentTarget.reset(); openAdmin(); }
      else $('#adminLoginError').classList.remove('hidden');
    });

    document.addEventListener('click', e=>{
      const start = e.target.closest('[data-enroll-start]');
      if (start) {
        const id = start.dataset.enrollStart;
        const holder = start.closest('.enroll-control');
        holder.innerHTML = `<div class="confirm-row"><button class="confirm-yes" data-enroll-confirm="${escapeHTML(id)}">Ha, yozilaman ✓</button><button class="confirm-no" data-enroll-cancel="${escapeHTML(id)}">Yo'q</button></div>`;
        return;
      }
      const yes = e.target.closest('[data-enroll-confirm]');
      if (yes) { const id=yes.dataset.enrollConfirm; submitEnrollment(id); const holder=yes.closest('.enroll-control'); holder.innerHTML=`<button class="course-enroll" data-enroll-start="${escapeHTML(id)}">Kursga yozilish <span>↗</span></button>`; return; }
      const no = e.target.closest('[data-enroll-cancel]');
      if (no) { const id=no.dataset.enrollCancel; no.closest('.enroll-control').innerHTML=`<button class="course-enroll" data-enroll-start="${escapeHTML(id)}">Kursga yozilish <span>↗</span></button>`; return; }
      const openTest = e.target.closest('[data-open-test]');
      if (openTest) { openQuiz(openTest.dataset.openTest); return; }
      const tab = e.target.closest('[data-admin-tab]');
      if (tab) { switchAdminTab(tab.dataset.adminTab); return; }
      const del = e.target.closest('[data-delete-type]');
      if (del) {
        const type=del.dataset.deleteType, id=del.dataset.deleteId;
        if (!confirm("Ushbu elementni o'chirishni xohlaysizmi?")) return;
        const map={course:KEYS.courses,teacher:KEYS.teachers,announcement:KEYS.announcements,test:KEYS.tests};
        if (map[type]) write(map[type],read(map[type]).filter(item=>item.id!==id));
        renderSite();renderAdmin();toast("Ma'lumot o'chirildi.");return;
      }
      const removeQuestion = e.target.closest('[data-remove-question]');
      if (removeQuestion) { removeQuestion.closest('.question-builder-item').remove(); $$('#questionBuilder .question-builder-head strong').forEach((el,i)=>el.textContent=`Savol ${i+1}`); }
    });
    $('#testModalContent').addEventListener('submit', e=>{if(e.target.id==='quizForm'){e.preventDefault();scoreQuiz(e.target)}});
    $('#courseForm').addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);
      const courses=getCourses();courses.push({id:uid(),title:String(f.get('title')).trim(),description:String(f.get('description')).trim(),duration:String(f.get('duration')).trim(),price:String(f.get('price')).trim(),image:safeURL(String(f.get('image')).trim())});
      write(KEYS.courses,courses);e.currentTarget.reset();renderSite();renderAdmin();toast("Yangi kurs qo'shildi.");
    });
    $('#teacherForm').addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);const list=getTeachers();
      list.push({id:uid(),name:String(f.get('name')).trim(),subject:String(f.get('subject')).trim(),bio:String(f.get('bio')).trim(),image:safeURL(String(f.get('image')).trim())});
      write(KEYS.teachers,list);e.currentTarget.reset();renderSite();renderAdmin();toast("Ustoz qo'shildi.");
    });
    $('#announcementForm').addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);const list=getAnnouncements();
      list.unshift({id:uid(),title:String(f.get('title')).trim(),text:String(f.get('text')).trim(),image:safeURL(String(f.get('image')).trim()),link:safeURL(String(f.get('link')).trim()),createdAt:new Date().toISOString()});
      write(KEYS.announcements,list);e.currentTarget.reset();renderSite();renderAdmin();toast("E'lon joylandi.");
    });
    $('#addQuestionBtn').addEventListener('click',addQuestion);
    $('#testForm').addEventListener('submit',e=>{
      e.preventDefault();
      const f=new FormData(e.currentTarget);
      const questionNodes=$$('#questionBuilder .question-builder-item');
      if(!questionNodes.length){toast("Kamida bitta savol qo'shing.",'error');return}
      const questions=[];
      for(const node of questionNodes){
        const text=$('[data-q-text]',node).value.trim();
        const options=$$('[data-option]',node).map(input=>input.value.trim());
        const points=Number($('[data-points]',node).value);
        if(!text||options.some(x=>!x)||!Number.isFinite(points)||points<1){toast("Savol, barcha javob variantlari va ballni to'ldiring.",'error');return}
        questions.push({text,options,correct:Number($('[data-correct]',node).value),points});
      }
      const tests=getTests();tests.push({id:uid(),title:String(f.get('title')).trim(),questions});write(KEYS.tests,tests);
      e.currentTarget.reset();$('#questionBuilder').innerHTML='';questionCount=0;addQuestion();renderSite();renderAdmin();toast("Test yaratildi.");
    });
    $('#passwordForm').addEventListener('submit',e=>{
      e.preventDefault();const f=new FormData(e.currentTarget);
      if(String(f.get('currentPassword'))!==getPassword()){toast("Joriy parol noto'g'ri.",'error');return}
      if(String(f.get('newPassword'))!==String(f.get('confirmPassword'))){toast("Yangi parollar bir xil emas.",'error');return}
      localStorage.setItem(KEYS.password,String(f.get('newPassword')));e.currentTarget.reset();toast("Admin paroli yangilandi.");
    });
    $('#resetDataBtn').addEventListener('click',()=>{
      if(!confirm("Barcha foydalanuvchi, kurs, ustoz, e'lon, test va yozilish ma'lumotlari o'chadi. Davom etasizmi?"))return;
      Object.values(KEYS).forEach(key=>localStorage.removeItem(key));initSeedData();renderSite();renderAdmin();closeAdmin();toast("Demo ma'lumotlari qayta tiklandi.");
    });
    $('#exportUsersBtn').addEventListener('click',()=>{
      const users=getUsers();
      const csv=[['Ism','Familiya','Telefon','Ro‘yxatdan o‘tgan'],...users.map(u=>[u.firstName,u.lastName,u.phone,u.createdAt])].map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
      const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='optimum-foydalanuvchilar.csv';a.click();URL.revokeObjectURL(url);
    });
    window.addEventListener('storage',e=>{
      if(Object.values(KEYS).includes(e.key)){renderSite();renderAdmin();}
    });
  }

  function start() {
    initSeedData();
    initEvents();
    renderSite();
    if (!read(KEYS.currentUser,null)) showModal('registrationModal');
  }
  document.addEventListener('DOMContentLoaded', start);
})();