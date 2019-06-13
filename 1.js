// ==UserScript==
// @name 设计文档实体枚举转换
// @description 根据设计文档生成前后端实体或枚举值
// @version 0.0.1
// @namespace https://wiki.sdtdev.net/
// @match *://wiki.sdtdev.net/*
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
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Sunlight.Domain;
using Abp.Domain.Entities;
/// <summary>
/// {{name}}
/// </summary>
[Table("{{code}}")]
public class {{code}} : Entity<Guid> {
    {{#data}}
    //{{name}} 
    {{#if IsRequiredString}}   
    [Required]   
    {{/if}}  
    {{#if format}}
    [MaxLength(EntityDefault.FieldLength_{{length}})]
    {{/if}}
    public {{type}} {{code}} {get;set;}

    {{/data}}
}
`

var backendTemplate = `
// {{name}}
public enum {{code}} {
    {{#data}}
    {{text}}={{value}},
    {{/data}}
}
`

;(function() {
    // 实体
    if ($('.entity table').length !== 0) {
        var title = $('#firstHeading')
            .text()
            .split('-')
        var entityInfo = {
            name: title[0].trim(),
            code: title[1].trim(),
            data: [],
        }
        $('.entity table:first tr:not(:first)').each(function() {
            var tds = $(this).find('td') 
            //这里正常类型isEnum为null,枚举类型isEnum=true,实体类型isEntity=true
            var isEnum = false 
            var isEntity = false
            //获取当前td里面的《a》标签里面的herf属性，从而确定是否是超链接
            var ishref = tds.eq(2).children('a')[0]
            var currentType = tds.eq(2).text().toLowerCase()
            if(ishref) {
              var title = tds.eq(2).children('a').attr('title')  
              var queryString = `action=query&format=json&prop=info%7Ccategories&titles=${title}&utf8=1&formatversion=2&inprop=displaytitle`;            
              $.ajax({
                  url:"/api.php",
                  data: queryString,
                  dataType:"json",
                  async:false
              }).done(function(data) {
                  //默认表格中有超链接的类型有两种：一种为枚举类型、另一种为实体类型
                  currentType = data.query.pages[0].displaytitle.split('-')[1]
                  if(data.query.pages[0].categories!=undefined){
                    var arr = data.query.pages[0].categories
                    for (var i = 0; i <arr.length; i++){
                          //当前currenttitle的类型为类似于：Exeed:DMS:XXX的形式，这里的目的主要是为了获取XXX
                          var currenttitle=arr[i].title
                          var index=currenttitle.lastIndexOf(':')
                          var category=currenttitle.slice(index+1)
                          if(category=='枚举'){
                            //这里不是枚举类型就是实体类型
                            isEnum = true
                            break
                          } else if(category=='实体'){
                            //这里不是枚举类型就是实体类型
                            isEntity = true
                            break
                          }
                    }                  
                  }                  
              })
            }       
            
            var tmp = {
                name: tds.eq(0).text(),
                code: tds.eq(1).text(),
                type: currentType,  
                isEnum: isEnum,    
                isEntity: isEntity,
                length: 0,
                required: tds.eq(3).text() === '是'
            }                    
            entityInfo.data.push(tmp)
        })
        console.log(entityInfo)
        var dataForEntity = {
            name: entityInfo.name,
            code: entityInfo.code,
            data: entityInfo.data.map(d => {
                var tmp = {
                    code: d.code,
                    name: d.name,
                    type: d.type,
                    required: d.required,
                    length: d.length
                }
                if(tmp.type==undefined){
                  tmp.type = 'string'
                  if(d.required) {
                      tmp.IsRequiredString = 'true'
                    } 
                } else if (d.type === 'money') {
                    tmp.type = 'decimal?'
                    if(d.required){
                      tmp.type = 'decimal'
                    } 
                } else if (d.type === 'boolean') {
                    tmp.type = 'bool?'
                    if(d.required){
                      tmp.type = 'bool'
                    }                     
                } else if (d.type === 'datetime') {
                    tmp.type = 'DateTime?'
                    if(d.required){
                      tmp.type = 'DateTime'
                    } 
                } else if (d.type === 'integer') {
                    tmp.type = 'int?' 
                    if(d.required){
                      tmp.type = 'int'
                    } 
                } else if (d.type === 'float') {
                    tmp.type = 'float?' 
                    if(d.required){
                      tmp.type = 'float'
                    }
                } else if (d.type === 'double') {
                    tmp.type = 'double?' 
                    if(d.required){
                      tmp.type = 'double'
                    } 
                } else if (d.type.startsWith('string')) {
                    tmp.type = 'string' 
                    tmp.format='string'
                    tmp.length = d.type.match(/\d+/g)[0] 
                    if(d.required) {
                      tmp.IsRequiredString = 'true'
                    } 
                } else {                 
                  if(d.isEnum){
                    var typeCopy = tmp.type
                    //默认枚举类型为C#中可为空类型
                    tmp.type = tmp.type+'?'
                    if(d.required){
                      tmp.type = typeCopy
                    }                    
                  } 
                  //表示当前代表实体对象
                  else if(d.isEntity) {
                    //默认为当前实体创建一个类型为Guid，并且名称为实体名称+Id的形式的C#属性
                    tmp.code=tmp.code+'Id'
                    tmp.type = 'Guid'                    
                  }
                }
                if (tmp.code == "AbandonerId"){
                  tmp.type = 'Guid?'
                }
                if (tmp.code == 'RowVersion'){
                  tmp.type = 'byte[]'
                }
                if (/(float)|(double)/.test(tmp.type)){
                  tmp.type='decimal' + (tmp.required ? "":"?")
                }
                return tmp
            }),
        }
        var code = Handlebars.compile(backend_entity_template)(
            dataForEntity
        )
        var btn1 = document.createElement('button')
        btn1.innerText = '复制实体对象'
        btn1.onclick = function() {
            GM_setClipboard(code)
        }
        $('.entity table:first').before(btn1)
    }

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

    // 枚举
    if ($('.enum table').length !== 0) {
        $('.enum table').each(function() {          

            var btn2 = document.createElement('button')
            btn2.innerText = '复制枚举对象'
            btn2.onclick = function() {
                var enumInfo = getEnumInfo()
                var backendCode = Handlebars.compile(backendTemplate)(enumInfo)
                GM_setClipboard(backendCode);
                
            }          
            $(this).before(btn2)
        })
    }
})()

