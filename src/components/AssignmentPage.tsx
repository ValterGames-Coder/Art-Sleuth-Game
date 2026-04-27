import React, { useState } from 'react';
import './AssignmentPage.css';

export default function AssignmentPage() {
  const [activeTab, setActiveTab] = useState<'articles' | 'mockup'>('articles');

  return (
    <div className="assignment-page">
      <header className="assignment-header">
        <h1>Проект «Арт-Сыщик» — Задание 2 этапа «Терра-Политех 2026»</h1>
        <button className="qr-back-btn" onClick={() => window.location.hash = ''}>
          Назад к игре
        </button>
      </header>

      <nav className="assignment-nav">
        <button 
          className={activeTab === 'articles' ? 'active' : ''} 
          onClick={() => setActiveTab('articles')}
        >
          Статьи об объектах (Экспонаты)
        </button>
        <button 
          className={activeTab === 'mockup' ? 'active' : ''} 
          onClick={() => setActiveTab('mockup')}
        >
          Виртуальный макет и Постер
        </button>
      </nav>

      <main className="assignment-content">
        {activeTab === 'articles' && (
          <div className="articles-section">
            <h2>Статьи об объектах внимания</h2>
            <p className="intro-text">
              В рамках нашей концепции объектами внимания выступают картины, полные скрытых смыслов. 
              Ниже представлены верифицированные статьи о картинах, с гиперссылками между ними и ссылками 
              на авторитетные источники (Википедию и официальные сайты музеев).
            </p>

            <article className="painting-article" id="bruegel">
              <h3>Питер Брейгель Старший — «Нидерландские пословицы» (1559)</h3>
              <p>
                <strong>«Нидерландские пословицы»</strong> (нидерл. Nederlandse Spreekwoorden), или «Мир вверх тормашками» — картина Питера Брейгеля Старшего, написанная в 1559 году. 
                Она представляет собой уникальное полотно, на котором изображено более ста нидерландских пословиц и поговорок.
              </p>
              <p>
                Эта работа является ярким примером жанровой живописи Северного Возрождения. Картина не только иллюстрирует народную мудрость, но и высмеивает человеческую глупость. 
                В отличие от более спокойных и реалистичных портретов конца XIX века, таких как 
                <a href="#serov" onClick={(e) => { e.preventDefault(); document.getElementById('serov')?.scrollIntoView({behavior: 'smooth'}); }}> «Девочка с персиками»</a>, 
                работа Брейгеля перенасыщена деталями и символизмом.
              </p>
              <p>
                <strong>Верификация и источники:</strong> 
                <a href="https://ru.wikipedia.org/wiki/Нидерландские_пословицы" target="_blank" rel="noreferrer"> Статья на Википедии</a>.
                Картина находится в коллекции <a href="https://www.smb.museum/museen-einrichtungen/gemaeldegalerie/home/" target="_blank" rel="noreferrer">Берлинской картинной галереи (Gemäldegalerie)</a>.
              </p>
              <a href={`${import.meta.env.BASE_URL}#painting/bruegel-proverbs`} className="play-link">Играть: искать скрытые смыслы на картине</a>
            </article>

            <article className="painting-article" id="serov">
              <h3>Валентин Серов — «Девочка с персиками» (1887)</h3>
              <p>
                <strong>«Девочка с персиками»</strong> — знаменитая картина русского живописца Валентина Серова, написанная в 1887 году в усадьбе Абрамцево. 
                На картине изображена 12-летняя Вера Мамонтова, дочь известного мецената Саввы Мамонтова.
              </p>
              <p>
                Это произведение считается одним из лучших примеров русского импрессионизма. В отличие от сложных аллегорий 
                <a href="#bruegel" onClick={(e) => { e.preventDefault(); document.getElementById('bruegel')?.scrollIntoView({behavior: 'smooth'}); }}> Питера Брейгеля</a>, 
                Серов фокусируется на мимолетности момента, игре света и свежести юности. Картина символизирует невинность и радость жизни.
              </p>
              <p>
                <strong>Верификация и источники:</strong> 
                <a href="https://ru.wikipedia.org/wiki/Девочка_с_персиками" target="_blank" rel="noreferrer"> Статья на Википедии</a>.
                Картина находится в <a href="https://www.tretyakovgallery.ru/" target="_blank" rel="noreferrer">Государственной Третьяковской галерее</a>.
              </p>
              <a href={`${import.meta.env.BASE_URL}#painting/serov-girl-with-peaches`} className="play-link">Играть: искать скрытые смыслы на картине</a>
            </article>

          </div>
        )}

        {activeTab === 'mockup' && (
          <div className="mockup-section">
            <h2>Виртуальный макет и информационный постер</h2>
            
            <div className="mockup-description">
              <h3>Концепция размещения в физическом пространстве</h3>
              <p>
                Наш проект работает на стыке реального и виртуального миров. В физическом музее (например, рядом с репродукциями картин в образовательном центре или галерее) будет размещен <strong>информационный постер</strong>.
              </p>
              <ul>
                <li><strong>Где:</strong> На стене рядом с картиной или у входа в тематический зал "Скрытые смыслы".</li>
                <li><strong>Как:</strong> Постер формата А2/А3 с ярким заглавием и правилами игры. В центре постера расположен крупный QR-код.</li>
                <li><strong>Что происходит при сканировании:</strong> Посетитель сканирует QR-код камерой телефона и моментально попадает на страницу конкретной картины в нашей игре «Арт-Сыщик» (цифровой двойник), где он может искать скрытые объекты.</li>
              </ul>
            </div>

            <div className="mockup-visual">
              <div className="virtual-wall">
                <div className="painting-frame">
                  <div className="painting-placeholder">
                    Картина<br/>(Физический объект)
                  </div>
                </div>
                <div className="poster-frame">
                  <div className="poster-content">
                    <h4>Арт-Сыщик</h4>
                    <p>Найди скрытые смыслы!</p>
                    <div className="qr-placeholder">
                      <img src={`${import.meta.env.BASE_URL}qr/bruegel-proverbs.svg`} alt="QR Code" />
                    </div>
                    <p className="scan-text">Сканируй и играй</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="poster-download">
              <h3>Требования к дизайну постера</h3>
              <p>Дизайн-проект постера должен привлекать внимание и быть интуитивно понятным:</p>
              <ol>
                <li><strong>Заголовок:</strong> Четкий призыв к действию (например, "Разгадай тайну картины!").</li>
                <li><strong>QR-код:</strong> Контрастный, легко считываемый с расстояния 1-2 метра.</li>
                <li><strong>Инструкция:</strong> 1. Наведи камеру ➔ 2. Найди объекты ➔ 3. Узнай факты.</li>
              </ol>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
