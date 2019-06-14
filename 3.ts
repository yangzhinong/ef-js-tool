// ==UserScript==
// @name 查询参数转换
// @description 查询参数转换
// @version 0.0.1
// @namespace http://editor.swagger.io/
// @match *://editor.swagger.io/*
// @require https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
// @require https://cdn.bootcss.com/handlebars.js/4.1.0/handlebars.min.js
// @grant GM_setClipboard
// @inject-into content
// ==/UserScript==

Handlebars.registerHelper('toCamelCase', function(str) {
    return `${str.slice(0, 1).toLowerCase()}${str.slice(1)}`
})
Handlebars.registerHelper('swaggerType', function(item) {
    var type = item.type
    switch (type) {
        case 'integer': {
            return 'integer'
        }
        case 'money':
        case 'number': {
            return `number`
        }
        default:
            return 'type: string'
    }
})

var backend_entity_template = `
public class {{code}} {
    {{#data}}
    {{#if isCode}}
      private string _code = "";
      public string Code { get => _code; set => _code = value?.ToUpper(); }
    {{else}}
      public {{type}} {{code}} {get;set;}
    {{/if}}
    {{/data}}
}
`
;(function() {
    // 实体
  
    setTimeout(function(){
        function toUpcaseFirstChar(str:string){
            return `${str.slice(0, 1).toUpperCase()}${str.slice(1)}`
        }
        type ObjT= {code:string,type:string, isCode:boolean};
        function getdata(){
            var lst={code:'', data:[] as ObjT[]};
            var $div=$('table.parameters').closest('div.opblock-tag-section');
            lst.code="Get" + $div.find("h4>a>span").text() + "Input";
            $('table.parameters tbody tr').each(function(i,tr){
                var $tr=$(tr);
                var o={} as ObjT;
                o.code= $tr.attr("data-param-name") as string;
                o.type= $tr.find("div:eq(1)").text();
                if (!(o.code == "pageSize" || o.code == "pageIndex" || o.code == "sortField" || o.code == "isDesc")) {
                    o.code=toUpcaseFirstChar((o.code));
                    if (o.type == "integer") o.type= "int?";
                    if (o.type == "float") o.type= "float?";
                    if (o.type == "boolean") o.type= "bool?";
                    if (o.type == "guid") o.type ="Guid?";
                    if (/Id$/.test(o.code)) o.type="Guid?";
                    if (/^id$/.test(o.code)) o.type="Guid?";
                    if (/time/i.test(o.code)) o.type="DateTime?";
                    if (/(status|type)$/i.test(o.code)) o.type= "*"+o.type; //很可能是枚举，得修改所以故意出错
                    if (o.code == "Code"){
                      o.isCode=true;
                    }
                    lst.data.push(o);
                }
            });
            console.dir("lst=",lst);
            var backendCode = Handlebars.compile(backend_entity_template)(lst)
            GM_setClipboard(backendCode)
        }
        var btn2 = document.createElement('button')
        btn2.innerText = '复制查询参数对象CodeUpCase'
        btn2.onclick = function() {
            getdata()
        } 
        let $divContainer=$('div.scheme-container');
        $divContainer.before(btn2); 
        var $select=$(`<select><option>== please select one ==</option></select>`);
        $divContainer.before($select);
        
        //@ts-ignore
        var text = window.clipboardData.getData("Text");
	alert(text);

    },500);
})();




