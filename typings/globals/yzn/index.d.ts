declare var Handlebars:{
    compile:(tpl:string)=> ((obj:any)=>string),
    registerHelper:any
};
declare var GM_setClipboard:(s:string)=>void;
declare var GM_log:(message:any)=>void;
