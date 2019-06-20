// ==UserScript==
// @name 设计文档接口转换1Remark
// @description 根据设计文档生成前后端实体或枚举值
// @version 0.0.1
// @namespace https://wiki.sdtdev.net/
// @match *://wiki.sdtdev.net/*
// @require https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js
// @require https://cdn.bootcss.com/handlebars.js/4.1.0/handlebars.min.js
// @grant GM_setClipboard
// @inject-into content
// ==/UserScript==


/// <reference path="typings/globals/yzn/index.d.ts" />
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
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Sunlight.Domain;
using Abp.Domain.Entities;
/// <summary>
/// {{name}}
/// </summary>
public class {{code}} {
    {{#data}}
    /// <summary>
    /// {{name}}
    /// </summary> 
    {{#if IsRequiredString}}   
    [Required]   
    {{/if}}  
    {{#if IsFormat}}
    [MaxLength(EntityDefault.FieldLength_{{length}})]
    {{/if}}
    public {{type}} {{code}} {get;set;}
    {{/data}}
}
`



;(function() {
    // 实体
    let lowerCaseFirstChar=(str)=>  `${str.slice(0, 1).toLowerCase()}${str.slice(1)}`;
    let trimCrlf = (str)=> {
        try {
            return str?str.replace(/^\s+|\s+$/g, ''):"";
        } catch(e){
            return "";
        }
        
    } 
    let $ths=$('tr:contains(字段序号)');
    $.each($ths, (i,th)=>{
        let $th=$(th);
        if ($th.length>0){

            let re=/[\(（](\w+)[)）]/;
            let entityInfo = {
                name: trimCrlf($('#firstHeading').text()),
                code: 'ApiSaptDto',
                data: [],
            }
            if (entityInfo.name.match(re)){
                entityInfo.code= `Api${entityInfo.name.match(re)[1]}DtO`;
            }
            let $row=$th.next();
            var lstDistinctCode=[] as string[];
            while ($row  && $row.length>0){
                let item= {
                    name:'',
                    IsRequiredString:false,
                    IsFormat:false,
                    type:'string',
                    code:'',
                    length:0
                };
                let  tds = $row.find('td');
                item.name= trimCrlf(tds.eq(1).text());
                item.code =trimCrlf(tds.eq(2).text());
                if (tds.eq(3).find("a").length>0){
                    item.type = 'unkown';
                } else {
                    item.type =lowerCaseFirstChar(trimCrlf(tds.eq(3).text()));
                }
                
                item.IsFormat= (trimCrlf(tds.eq(4).text())?true:false);
                if (item.IsFormat){
                    item.length = Number(trimCrlf(tds.eq(4).text()));
                }
                {
                    let txt=trimCrlf(tds.eq(5).html());
                    if (txt){
                        item.IsRequiredString=true;
                    } else {
                        item.IsRequiredString=false;
                    }
                }
                if (item.type=="money"){
                    item.type="decimal";
                }
                if (!item.IsRequiredString && item.type !=="string"){
                    item.type=item.type+"?"
                }
                if (tds.eq(6).attr("rowspan")){
                    item.name += "   " + trimCrlf(tds.eq(7).text());
                } else {
                    item.name += "   " + trimCrlf(tds.eq(6).text());
                }
                {
                    //检查字段名段重复
                    let upCode= item.code.toUpperCase();
                    if (lstDistinctCode.indexOf(upCode)<0){
                        entityInfo.data.push(item);
                    }
                    lstDistinctCode.push(upCode);
                }
               
                $row=$row.next();
            }
    
            var code = Handlebars.compile(backend_entity_template)(entityInfo );
            var btn1 = document.createElement('button')
            btn1.innerText = '复制inteface实体对象1Remark'
            btn1.onclick = function() {
                GM_setClipboard(code)
            }
            $th.closest("table").before(btn1);
        }
    });
    function getEnumInfo() {
        var title = $('#firstHeading')
            .text()
            .split('-')
        var enumInfo = {
            name: title[0].trim(),
            code: title[1].trim(),
            data: [],
        }
        $('.enum tr:not(:first)').each(function() {
            var tds = $(this).find('td')
            var tmp = {
                text: tds.eq(0).text(),
                value: tds.eq(1).text(),
            }
            enumInfo.data.push(tmp)
        })
        return enumInfo
    }
})()

