const    MODULE  =   "theory-forum";
const    DEFAULTS    =   {
    enabled:    true,
    frequency:  5,
    visible:    false,
    stylePrompt:    "Пиши   в   стиле   анонимных   имиджборд.  Сленг,  сарказм,    ирония, капс.   Русский язык.",
};
let    EXT_SETTINGS    =   null;
let    getContext  =   null;
let    eventSource =   null;
let    event_types =   null;
let    generateQuietPrompt =   null;
let    saveSettings    =   null;
let    msgCounter  =   0;
let    isGenerating    =   false;
jQuery(async    ()  =>  {
    try {
        const   ext =   await   import("../../../extensions.js");
        getContext  =   ext.getContext;
        if  (ext.extension_settings)    EXT_SETTINGS    =   ext.extension_settings;
        if  (typeof ext.saveSettingsDebounced   === "function") saveSettings    =   ext.saveSettingsDebounced;
        else    if  (typeof ext.saveMetadataDebounced   === "function") saveSettings    =   ext.saveMetadataDebounced;
    }   catch   (e) {
        console.error("[TF] FAIL    extensions",    e);
        return;
    }
    try {
        const   scr =   await   import("../../../../script.js");
        eventSource =   scr.eventSource;
        event_types =   scr.event_types;
        if  (typeof scr.generateQuietPrompt === "function") generateQuietPrompt =   scr.generateQuietPrompt;
        if  (!saveSettings  &&  typeof  scr.saveSettingsDebounced   === "function") saveSettings    =   scr.saveSettingsDebounced;
    }   catch   (e) {
        console.warn("[TF]  FAIL    script",    e);
    }
    if  (!saveSettings) saveSettings    =   ()  =>  {};
    loadSettings();
    createForumPanel();
    createSettingsPanel();
    if  (eventSource    &&  event_types)    {
        eventSource.on(event_types.MESSAGE_RECEIVED,    onNewMessage);
        eventSource.on(event_types.CHAT_CHANGED,    ()  =>  {   msgCounter  =   0;  });
    }
});
function    loadSettings()  {
    if  (!EXT_SETTINGS) EXT_SETTINGS    =   {};
    if  (!EXT_SETTINGS[MODULE]) EXT_SETTINGS[MODULE]    =   {};
    for (const  [k, v]  of  Object.entries(DEFAULTS))   {
        if  (EXT_SETTINGS[MODULE][k]    === undefined)  EXT_SETTINGS[MODULE][k] =   v;
    }
}
function    s() {   return  EXT_SETTINGS[MODULE];   }
function    createForumPanel()  {
    const   html    =   `\n<div id="tf-forum-panel" class="tf-popup"    style="display:none;">\n<div    class="tf-header"   id="tf-drag-handle">\n<span>/theory/    —   Доска   теорий</span>\n<button  id="tf-close-btn"   class="tf-close-btn">[X]</button>\n</div>\n<div class="tf-content"  id="tf-content">\n<div  class="tf-post">\n<div  class="tf-post-header"><span    class="tf-anon">Система</span></div>\n<div  class="tf-post-text">Нажми  «Сгенерировать» в   настройках  расширения.</div>\n</div>\n</div>\n</div>`;
    $("body").append(html);
    $("#tf-close-btn").on("click", ()  =>  {
        $("#tf-forum-panel").fadeOut(200);
        s().visible =   false;
        saveSettings();
    });
    makeDraggable("#tf-forum-panel",    "#tf-drag-handle");
    if  (s().visible)   $("#tf-forum-panel").show();
}
function    makeDraggable(panel,    handle) {
    let drag    =   false,  sx, sy, sl, st;
    $(document).on("mousedown",    handle, function    (e) {
        if  ($(e.target).closest(".tf-close-btn").length)  return;
        drag    =   true;
        sx  =   e.clientX;  sy  =   e.clientY;
        const   o   =   $(panel).offset();
        sl  =   o.left; st  =   o.top;
        e.preventDefault();
    });
    $(document).on("mousemove",    function    (e) {
        if  (!drag) return;
        $(panel).css({ left:   sl  +   e.clientX   -   sx, top:    st  +   e.clientY   -   sy, right:  "auto"  });
    });
    $(document).on("mouseup",  ()  =>  {   drag    =   false;  });
}
function    createSettingsPanel()   {
    const   html    =   `\n<div id="tf-ext-settings"    class="extension_settings">\n<div   class="inline-drawer">\n<div    class="inline-drawer-toggle inline-drawer-header">\n<b>Theory   Forum</b>\n<div class="inline-drawer-icon   fa-solid    fa-chevron-down down"></div>\n</div>\n<div  class="inline-drawer-content">\n<div    style="display:flex;flex-direction:column;gap:8px;padding:5px;">\n<label    class="checkbox_label">\n<input id="tf-enabled" type="checkbox"/>\n<span>Автогенерация</span>\n</label>\n<label style="display:flex;align-items:center;gap:8px;">\n<span>Каждые N   сообщений:</span>\n<input   id="tf-frequency"   type="number"   min="1" max="200"   class="text_pole"   style="width:60px;"/>\n</label>\n<label>\n<span>Стиль   (промпт):</span>\n<textarea id="tf-style-prompt"    class="text_pole"   rows="3"    style="width:100%;margin-top:4px;"></textarea>\n</label>\n<div  style="display:flex;gap:6px;margin-top:10px;">\n<button id="tf-toggle"  class="menu_button">👁  Показать</button>\n<button  id="tf-gen" class="menu_button">⚡   Сгенерировать</button>\n</div>\n</div>\n</div>\n</div>\n</div>`;
    const   container   =   $("#extensions_settings2").length  ?   "#extensions_settings2" :   "#extensions_settings";
    $(container).append(html);
    $("#tf-enabled").prop("checked",   s().enabled);
    $("#tf-frequency").val(s().frequency);
    $("#tf-style-prompt").val(s().stylePrompt);
    $("#tf-enabled").on("change",  function    ()  {   s().enabled =   $(this).prop("checked");   saveSettings(); });
    $("#tf-frequency").on("input", function    ()  {   s().frequency   =   Math.max(1, parseInt($(this).val())    ||  5); saveSettings(); });
    $("#tf-style-prompt").on("input",  function    ()  {   s().stylePrompt =   $(this).val(); saveSettings(); });
    $("#tf-toggle").on("click",    ()  =>  {   $("#tf-forum-panel").fadeToggle(200);  s().visible =   $("#tf-forum-panel").is(":visible");   saveSettings(); });
    $("#tf-gen").on("click",   ()  =>  generateTheory());
}
function    rndId() {   return  Math.floor(100000   +   Math.random()   *   900000);    }
function    nowDate()   {
    const   d   =   new Date(), p   =   (n) =>  String(n).padStart(2,   "0");
    return  `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()}   ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function    esc(str)    {   return  str.replace(/&/g,"&").replace(/</g,"<").replace(/>/g,">").replace(/\n/g,"<br>");  }
function    renderForum(data)   {
    const   opId    =   rndId(),    date    =   nowDate();
    let h   =   `<div   class="tf-post"><div    class="tf-post-header">\n<span  class="tf-anon">Аноним</span><span  class="tf-date">${date}</span><span    class="tf-post-id">No.${opId}</span>\n</div><div   class="tf-post-text">${esc(data.op)}</div></div>`;
    data.replies.forEach((text, i)  =>  {
        h   +=  `<div   class="tf-reply"><div   class="tf-post-header">\n<span  class="tf-anon">Аноним</span><span  class="tf-date">${date}</span>\n<span  class="tf-post-id">No.${opId+i+1}</span><span  class="tf-quote-link">>>${opId}</span>\n</div><div class="tf-post-text">${esc(text)}</div></div>`;
    });
    $("#tf-content").html(h);
}
function    getRecentChat(max)  {
    if  (!getContext)   return  "";
    const   ctx =   getContext();
    if  (!ctx.chat  ||  !ctx.chat.length)   return  "";
    let out =   "";
    for (const  m   of  ctx.chat.slice(-max))   {
        if  (m.is_system)   continue;
        const   name    =   m.is_user   ?   (ctx.name1  ||  "Игрок")    :   (m.name ||  ctx.name2   ||  "Персонаж");
        const   text    =   m.mes   ?   m.mes.substring(0,  400)    :   "";
        if  (text)  out +=  `${name}:  ${text}\n`;
    }
    return  out;
}
function    parseResponse(text) {
    const   r   =   {   op: "", replies:    []  };
    const   opM =   text.match(/---OP---([\s\S]*?)(?=---REPLY1---|$)/);
    const   r1  =   text.match(/---REPLY1---([\s\S]*?)(?=---REPLY2---|$)/);
    const   r2  =   text.match(/---REPLY2---([\s\S]*?)(?=---REPLY3---|$)/);
    const   r3  =   text.match(/---REPLY3---([\s\S]*?)$/);
    if  (opM)   {
        r.op    =   opM[1].trim();
        if  (r1)    r.replies.push(r1[1].trim());
        if  (r2)    r.replies.push(r2[1].trim());
        if  (r3)    r.replies.push(r3[1].trim());
    }   else    r.op    =   text.trim();
    while   (r.replies.length   <   3)  r.replies.push("...");
    return  r;
}
async    function    generateTheory()    {
    if  (isGenerating)  return;
    if  (!generateQuietPrompt)  {
        renderForum({   op: "Ошибка API.    Проверь консоль.",  replies:    ["F",   "Сломалось"]    });
        return;
    }
    const   chat    =   getRecentChat(20);
    if  (!chat.trim())  {
        renderForum({   op: "Тред   пуст.   Начни   ролевую.",  replies:    ["Бамп",    "Ньюфаг"]   });
        return;
    }
    isGenerating    =   true;
    renderForum({   op: "Генерация  теории...", replies:    ["Ждём...", "Анон   думает...", "..."]  });
    if  (!$("#tf-forum-panel").is(":visible")) {   $("#tf-forum-panel").fadeIn(200);  s().visible =   true;   saveSettings(); }
    const   prompt  =   `[SYSTEM:   You are generating  imageboard  content,    not roleplaying.]\nСоздай   тред    анонимного  форума  с   теорией о   сюжете.\nСтиль: ${s().stylePrompt}\nКонтекст   сюжета:\n${chat}\nФормат   СТРОГО:\n---OP---\n(теория, 2-5 предложений)\n---REPLY1---\n(комментарий,   1-2 предложения)\n---REPLY2---\n(комментарий,   1-2 предложения)\n---REPLY3---\n(комментарий,   1-2 предложения)`;
    try {
        const   resp    =   await   generateQuietPrompt(prompt, false,  true);
        renderForum(parseResponse(resp));
    }   catch   (e) {
        renderForum({   op: `Ошибка:    ${e.message    ||  e}`,    replies:    ["F",   "Попробуй   ещё"]   });
    }   finally {   isGenerating    =   false;  }
}
function    onNewMessage()  {
    if  (!s().enabled)  return;
    msgCounter++;
    if  (msgCounter >=  s().frequency)  {   msgCounter  =   0;  generateTheory();   }
}
