// DOM ready (script loaded at end of body)
(function(){
  // <-- ваши ключи (замените на реальные)
  const FINNHUB_API_KEY = 'd4hg649r01quqml8qc9gd4hg649r01quqml8qca0';

  // Базовые endpoint'ы (следуем REST API docs)
  const FINNHUB = 'https://finnhub.io/api/v1';

  // Бырый кэш DOM элементов для повторного использования
  const tickerInput = document.getElementById('ticker');
  const analyzeBtn = document.getElementById('analyze');
  const resultsEl = document.getElementById('results');
  const quizzesEl = document.getElementById('quizzes');
  const statusEl = document.getElementById('status');
  const glossaryModal = document.getElementById('glossaryModal');

  // Универсальный fetch с разбором ошибок REST API
  async function getJson(url){
    try{
      const res = await fetch(url);
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch(e){ data = text; }
      if(!res.ok){
        const msg = data && data.error ? data.error : (data && data.message ? data.message : text || res.statusText);
        return { ok:false, status: res.status, message: String(msg), raw: data };
      }
      return { ok:true, status: res.status, data };
    }catch(err){
      return { ok:false, status: 0, message: String(err) };
    }
  }

  // UI helpers
  function setStatus(s){ statusEl.textContent = s; }
  function showError(msg){ setStatus('Ошибка'); console.error(msg); alert(String(msg)); }

  // Очистка UI перед новым анализом
  function clearUI(){
    resultsEl.innerHTML = '';
    quizzesEl.innerHTML = '';
    setStatus('');
    // закрыть глоссарий если открыт
    if (glossaryModal) glossaryModal.style.display = 'none';
  }

  // --- существующая логика тултипов/учебных подсказок ---
  const tips = [
    'Читай краткие отчёты (письменные выводы за квартал) — ищи тренды прибыли и дохода.',
    'Сравнивай P/E с конкурентами в той же отрасли, а не только с абсолютными порогами.',
    'Не полагайся только на новости — проверяй официальные релизы компании.',
    'Делай чек-лист перед покупкой: цель, риск, сумма, точка выхода.',
    'Используй mock-режим для тренировок: пробуй разные тикеры и проверяй ответы в квизах.'
  ];
  const studyList = document.getElementById('studyTips');
  if (studyList && studyList.children.length === 0) {
    tips.forEach(t => { const li = document.createElement('li'); li.textContent = t; studyList.appendChild(li); });
  }

  ['chkGoal','chkRisk','chkDivers'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const key = 'sc_' + id;
    el.checked = localStorage.getItem(key) === '1';
    el.addEventListener('change', () => localStorage.setItem(key, el.checked ? '1' : '0'));
  });

  const showTipsBtn = document.getElementById('showTips');
  if (showTipsBtn) showTipsBtn.addEventListener('click', () => {
    alert('Study Tips открыты в панели справа. Поработайте над каждым пунктом по очереди.');
  });

  const glossaryBtn = document.getElementById('glossaryBtn');
  if (glossaryBtn) glossaryBtn.addEventListener('click', () => {
    if (glossaryModal) glossaryModal.style.display = 'flex';
  });
  const closeGloss = document.getElementById('closeGloss');
  if (closeGloss) closeGloss.addEventListener('click', () => {
    if (glossaryModal) glossaryModal.style.display = 'none';
  });

  // Enter key в поле тикера запускает анализ
  tickerInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      analyzeBtn.click();
    }
  });

  // Анализатор — теперь использует getJson и явно обрабатывает коды из REST API
  analyzeBtn.addEventListener('click', async () => {
    const ticker = tickerInput.value.trim().toUpperCase();
    if(!ticker) return alert('Введите тикер');

    // Очистка предыдущих данных и подготовка UI
    clearUI();
    analyzeBtn.disabled = true;
    setStatus('Загрузка...');

    try{
      // --- если ключа для NewsAPI нет, используем Finnhub company-news ---
      const NEWSAPI_KEY = ''; // <-- нет ключа для NewsAPI, используем Finnhub
      const NEWSAPI = 'https://newsapi.org/v2';

      // выбираем endpoint для новостей
      let newsEndpoint;
      if (NEWSAPI_KEY && NEWSAPI_KEY.trim()) {
        newsEndpoint = `${NEWSAPI}/everything?q=${encodeURIComponent(ticker)}&pageSize=5&apiKey=${NEWSAPI_KEY}`;
      } else {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - 30); // последние 30 дней
        const fmt = d => d.toISOString().slice(0,10);
        newsEndpoint = `${FINNHUB}/company-news?symbol=${encodeURIComponent(ticker)}&from=${fmt(from)}&to=${fmt(to)}&token=${FINNHUB_API_KEY}`;
      }

      // Соблюдаем документацию: profile2, quote, financials-reported (Finnhub) и выбранный источник новостей
      const endpoints = [
        `${FINNHUB}/stock/profile2?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`,
        `${FINNHUB}/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`,
        `${FINNHUB}/stock/financials-reported?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_API_KEY}`,
        newsEndpoint
      ];

      const [profileRes, quoteRes, finRes, newsRes] = await Promise.all(endpoints.map(getJson));

      // Проверяем ответы и показываем подробности по ошибкам REST API
      if(!profileRes.ok) return showError(`Profile error ${profileRes.status}: ${profileRes.message}`);
      if(!quoteRes.ok) return showError(`Quote error ${quoteRes.status}: ${quoteRes.message}`);
      if(!finRes.ok) {
        console.warn('Financials warning', finRes);
      }
      if(!newsRes.ok) {
        console.warn('News warning', newsRes);
      }

      // Нормализация данных согласно REST API docs
      const profile = (profileRes.data && profileRes.data.name) ? profileRes.data : { name: ticker + ' (mock)', marketCap: profileRes.data && profileRes.data.marketCapitalization ? Number(profileRes.data.marketCapitalization)*1_000_000 : 50_000_000_000 };
      const quote = quoteRes.data && ('c' in quoteRes.data) ? quoteRes.data : { c: 100, pc: 95, h: null, l: null };
      // Финансовые данные — fallback mock
      let financials = {
        annual: [
          { year: 2024, netIncome: 500000000 },
          { year: 2023, netIncome: -20000000 },
          { year: 2022, netIncome: -50000000 },
          { year: 2021, netIncome: 100000000 }
        ],
        pe: 18
      };
      // Нормализуем новости: Finnhub возвращает массив, NewsAPI — { articles: [...] }
      let news = [{ headline: 'No news available', datetime: Date.now()/1000 }];
      if (newsRes.ok && Array.isArray(newsRes.data)) {
        // Finnhub company-news
        news = newsRes.data.map(n => ({ headline: n.headline || n.summary || n.source, datetime: n.datetime || Math.floor(Date.now()/1000) }));
      } else if (newsRes.ok && newsRes.data && Array.isArray(newsRes.data.articles)) {
        // NewsAPI
        news = newsRes.data.articles.map(a => ({ headline: a.title, datetime: Math.floor(new Date(a.publishedAt).getTime()/1000) }));
      }

      // Логика оценки (как раньше)
      const cap = profile.marketCap || null;
      const capText = cap ? (cap > 10_000_000_000 ? 'Капитализация большая (>10B)' : 'Малая/средняя капитализация (<10B)') : 'Нет данных о капитализации';
      const last3 = (financials.annual || []).slice(0,3);
      const losing3 = last3.length === 3 && last3.every(y=>y.netIncome < 0);
      const profitText = losing3 ? 'Компания в убытке последние 3 года' : 'Компания не в убытке все последние 3 года';
      const pe = financials.pe || null;
      const peText = pe ? (pe > 25 ? 'Может быть переоценена (P/E > 25)' : (pe < 10 ? 'Может быть недооценена (P/E < 10)' : 'P/E в среднем диапазоне')) : 'Нет данных P/E';
      const volSignal = (quote.c && quote.pc) ? (quote.c > quote.pc ? 'Цена растёт (покупки?)' : 'Цена падает (продажи?)') : 'Нет данных по объёму/цене';

      const POS = ['profit','up','beat','growth','record','surge','acquire','buy','positive','upgrade','strong'];
      const NEG = ['loss','down','miss','drop','decline','cut','reduce','sell','negative','downgrade','weak'];
      let score = 0;
      const newsList = news.map(n => {
        const text = (n.headline || n.summary || '').toLowerCase();
        POS.forEach(w=> { if(text.includes(w)) score++; });
        NEG.forEach(w=> { if(text.includes(w)) score--; });
        return `<li>${new Date((n.datetime||Date.now())*1000).toLocaleDateString()} — ${n.headline}</li>`;
      }).join('');
      const newsEval = score > 0 ? 'Новости в основном позитивные' : (score < 0 ? 'Новости в основном негативные' : 'Новости смешанные/нейтральные');

      // Рендер результатов (динамически обновляет содержимое)
      resultsEl.innerHTML = `
        <div class="card">
          <h3 style="margin:0 0 6px">${profile.name} <small style="color:var(--muted)">(${ticker})</small></h3>

          <!-- PRICE & GROWTH -->
          <div class="price-row" style="display:flex;align-items:center;gap:12px;margin:8px 0;">
            <div style="font-size:22px;font-weight:700;">${quote.c}</div>
            <div class="${(quote.c - quote.pc) > 0 ? 'good' : ((quote.c - quote.pc) < 0 ? 'bad' : '')}" style="font-weight:700;">
              ${ (quote.c - quote.pc) > 0 ? '▲' : ((quote.c - quote.pc) < 0 ? '▼' : '—') }
              ${ (typeof quote.pc === 'number' && quote.pc !== 0) ? ((quote.c - quote.pc).toFixed(2)) : '' }
              ${ (typeof quote.pc === 'number' && quote.pc !== 0) ? '(' + (((quote.c - quote.pc)/quote.pc)*100).toFixed(2) + '%)' : '' }
            </div>
          </div>

          <!-- RANGE bar (position between low/high if available) -->
          <div class="metric">
            <div>Дневной диапазон</div>
            <div style="min-width:260px">
              <div class="range-bar">
                <div class="range-fill" style="width:${(quote.h && quote.l && quote.h>quote.l) ? (Math.max(0, Math.min(1, (quote.c - quote.l)/(quote.h - quote.l)))*100) : 50}%;"></div>
              </div>
              <div style="font-size:12px;color:var(--muted);margin-top:6px;">low: ${quote.l ?? '—'}  •  high: ${quote.h ?? '—'}</div>
            </div>
          </div>

          <div class="metric"><div>Капитализация <span class="info">ℹ<span class="tip">Рыночная капитализация — цена × число акций в обращении.</span></span></div><div>${capText}</div></div>
          <div class="metric"><div>Чистая прибыль (последние 3 года) <span class="info">ℹ<span class="tip">Проверка, были ли убытки 3 года подряд — сигнал риска.</span></span></div><div class="${losing3 ? 'bad' : 'good'}">${profitText}</div></div>
          <div class="metric"><div>P/E <span class="info">ℹ<span class="tip">Цена/прибыль — высокое значение может означать ожидания роста.</span></span></div><div>${peText} ${pe ? `(P/E=${pe})` : ''}</div></div>
          <div class="metric"><div>Текущий тренд</div><div>${volSignal}</div></div>
          <h4 style="margin-top:12px">Новости — оценка: ${newsEval}</h4>
          <ul style="margin:6px 0 0 18px">${newsList}</ul>
        </div>
      `;

      renderQuizzes(profile, quote, financials, newsEval);
      setStatus('Готово');

    }catch(err){
      showError(err);
    }finally{
      analyzeBtn.disabled = false;
    }
  });

  // Квизы (как раньше)
  function renderQuizzes(profile, quote, financials, newsEval){
    const q = quizzesEl;
    q.innerHTML = '';
    const items = [];
    items.push({ q: 'Капитализация компании > 10 млрд?', a: (profile.marketCap || 0) > 10_000_000_000 });
    const last3 = (financials.annual || []).slice(0,3);
    items.push({ q: 'Компания теряет деньги последние 3 года?', a: last3.length === 3 && last3.every(y => y.netIncome < 0) });
    items.push({ q: 'Акция выглядит недооцененной по P/E (<10)?', a: (financials.pe && financials.pe < 10) });
    items.push({ q: 'Новости позитивны?', a: newsEval.toLowerCase().includes('позит') });

    items.forEach((it, idx) => {
      const div = document.createElement('div');
      div.style.marginBottom = '8px';
      div.innerHTML = `<div><strong>${it.q}</strong></div>`;
      const yes = document.createElement('button'); yes.textContent = 'Да';
      const no = document.createElement('button'); no.textContent = 'Нет';
      yes.onclick = () => showAnswer(it.a === true);
      no.onclick = () => showAnswer(it.a === false);
      div.appendChild(yes); div.appendChild(no);
      q.appendChild(div);
    });

    function showAnswer(correct){
      const msg = document.createElement('div');
      msg.textContent = correct ? 'Правильно' : 'Неправильно — проверьте данные выше';
      msg.className = correct ? 'good' : 'bad';
      msg.style.marginTop = '6px';
      q.appendChild(msg);
      setTimeout(()=> msg.remove(), 3000);
    }
  }

})();