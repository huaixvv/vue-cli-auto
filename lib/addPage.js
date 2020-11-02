const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const inquirer = require('inquirer')
const request = require('request')
const log = content => console.log(chalk.green(content))

// 查询文件夹及子文件里面.vue文件
const searchRecursive = function(dir, pattern) {
  var results = []

  fs.readdirSync(dir).forEach(function (dirInner) {
    dirInner = path.resolve(dir, dirInner)

    var stat = fs.statSync(dirInner)

    if (stat.isDirectory()) {
      results = results.concat(searchRecursive(dirInner, pattern))
    }

    if (stat.isFile() && dirInner.endsWith(pattern)) {
      results.push(dirInner)
    }
  })

  return results
}

// 获取github上vue文件路径
const getGithubVueFile = function() {
  let fileVueTemplate = []
  return new Promise((resolve, reject) => {
    request({
      url: 'https://gitee.com/api/v5/repos/myreally/default-template/contents/src/template?ref=master'
    },
    function(err, response, body) {
      if(err) {
        log(`❌  获取gitee数据异常 ${err}`)
        reject(false)
      } else {
        JSON.parse(body).forEach(item => {
          fileVueTemplate.push({
            name: item.name,
            value: {
              url: item.url,
              branch: 'master'
            }
          })
        })
        resolve(fileVueTemplate)
      }
    })
  })
}

// 获取github上js文件路径
const getGithubJsFile = function() {
  let fileJsTemplate = []
  return new Promise((resolve, reject) => {
    request({
      url: 'https://gitee.com/api/v5/repos/myreally/default-template/contents/src/utils?ref=master'
    },
    function(err, response, body) {
      if(err) {
        log(`❌  获取gitee数据异常 ${err}`)
        reject(false)
      } else {
        JSON.parse(body).forEach(item => {
          fileJsTemplate.push({
            name: item.name,
            value: {
              url: item.url,
              branch: 'master'
            }
          })
        })
        resolve(fileJsTemplate)
      }
    })
  })
}

// 获取github上文件夹路径
const getGithubFiles = function() {
  let fileComponentsTemplate = []
  return new Promise((resolve, reject) => {
    request({
      url: 'https://gitee.com/api/v5/repos/myreally/default-template/contents/src/components?ref=master'
    },
    function(err, response, body) {
      if(err) {
        log(`❌  获取gitee数据异常 ${err}`)
        reject(false)
      } else {
        JSON.parse(body).forEach(item => {
          fileComponentsTemplate.push({
            name: item.name,
            value: {
              url: item.url,
              branch: 'master'
            }
          })
        })
        resolve(fileComponentsTemplate)
      }
    })
  })
}

// 递归获取gitee文件目录
const getFilesAll = function() {
  let fileComponentsTemplate = []
  return new Promise((resolve, reject) => {
    request({
      url: 'https://gitee.com/api/v5/repos/myreally/default-template/git/trees/master?recursive=1'
    },
    function(err, response, body) {
      if(err) {
        log(`❌  获取gitee数据异常 ${err}`)
        reject(false)
      } else {
        // JSON.parse(body).forEach(item => {
        //   fileComponentsTemplate.push({
        //     name: item.name,
        //     value: {
        //       url: item.url,
        //       branch: 'master'
        //     }
        //   })
        // })
        resolve(body)
      }
    })
  })
}
// 读取文件内容

const readFileContent = function(url) {
  return new Promise((resolve, reject) => {
    request({
      url
    },
    function(err, response, body) {
      if(err) {
        log(`❌  读取数据异常 ${err}`)
        reject(false)
      } else {
        resolve(JSON.parse(body))
      }
    })
  })

}

// const templates = [
//   {name: 'template-1', value: {url: 'https://template-1', branch: 'master'}},
//   {name: 'template-2', value: {url: 'https://template-2', branch: 'dev'}}
// ]
/* 判断文件是否存在的函数
*@path_way, 文件路径
 */
const isFileExisted = function (path_way) {
  return new Promise((resolve, reject) => {
    fs.access(path_way, (err) => {
      if (err) {
        reject(false)//"不存在"
      } else {
        resolve(true)//"存在"
      }
    })
  })
}

// 交互式选择vue文件
const chooseVueFile = async function(file, type) {
  const fileTemplate = type === 'js' ? await getGithubJsFile() : await getGithubVueFile()
  // 交互式选择文件
  const res = await inquirer.prompt([{
    type:'list',
    name: 'fileTemplate',
    message: `please check ${type} template`,
    choices: () => {
      return fileTemplate
    },
    default: fileTemplate[0]
  }])
  // 读写文件
  // log(`选择的文件${JSON.stringify(res)}`)
  const {url} = res.fileTemplate
  const fileContent = await readFileContent(url)
  // log(`选择的文件${JSON.stringify(fileContent)}`)
  fs.writeFileSync(file, Buffer.from(fileContent.content, 'base64').toString('utf8'))
}

// 交互式选择文件
const chooseFiles = async function(file) {
  const fileTemplate = await getGithubFiles()
  // 交互式选择文件
  const res = await inquirer.prompt([{
    type:'list',
    name: 'fileTemplate',
    message: `please check template`,
    choices: () => {
      return fileTemplate
    },
    default: fileTemplate[0]
  }])
  // 读写文件
  log(`选择的文件${JSON.stringify(res)}`)
  const {url} = res.fileTemplate
  const endSplitUrl = url.substring(url.lastIndexOf('\/') + 1, url.length)
  const fileContent = await readFileContent(url)
  log(`选择的文件${JSON.stringify(fileContent)}`)
  const filesAll = await getFilesAll()
  log(`获取所有文件tree${filesAll}`)
  JSON.parse(filesAll).tree.forEach(item => {
    if (item.path === fileContent.path && item.type === 'blob') {
      // let endUrl = item.path.substring(item.path.lastIndexOf('\/') + 1, item.path.length)
      fs.writeFileSync(fs.mkdirSync(file + endSplitUrl), Buffer.from(item.content, 'base64').toString('utf8'))
    }
  })
  // fs.writeFileSync(file, Buffer.from(fileContent.content, 'base64').toString('utf8'))
}

module.exports = async name => {
  log(`🔥 替换的模版：${name}`)
  // 获取列表
  // const pageList = searchRecursive('./src/pages', '.vue')

  // 获取替换文件路径
  const replaceFile = path.resolve('./', name)
  // 获取url斜杠前面路径
  const preSplitFiles = replaceFile.substring(0, replaceFile.lastIndexOf('\/') + 1)
  const endSplitFiles = replaceFile.substring(replaceFile.lastIndexOf('\/') + 1, replaceFile.length)
  const pageUrlList = fs.readdirSync(preSplitFiles)
  const stat = fs.lstatSync(replaceFile) // 判断是否是文件
  const fileExtname = path.extname(endSplitFiles) // 判断文件后缀

  try {
    const isExisted = await isFileExisted(replaceFile)
    log(`📃 是否存在文件${isExisted}`)
    log(`是否是文件 ${stat.isFile()}`) //是文件吗
    log(`是否是文件夹${stat.isDirectory()}`) //是文件夹吗
    if (isExisted) {
      if (stat.isFile()) { // 是文件
        log(`📃 文件格式 ${fileExtname}`)
        switch(fileExtname) {
          case '.js':
            await chooseVueFile(replaceFile, 'js')
            break;
          case '.vue':
            await chooseVueFile(replaceFile, 'vue')
            break;
          default:
        }
      } else if (stat.isDirectory()) { // 是文件夹
        log(`123`)
        await chooseFiles(replaceFile)
      } else {
        log(`❌ 文件格式不正确`)
      }

    }
  } catch (error) {
    log(`❌ 文件不存在 ${error}`)
  }
  // 获取url斜杠后面面路径
  log(`🗄️ replaceFile文件${replaceFile}`)
  log(`🗄️ preSplitFiles文件${preSplitFiles}`)
  log(`📃 endSplitFiles文件${endSplitFiles}`)
  log(`🗄️ 文件地址 ${path.resolve('./')}`)
  log(`🗄️ 文件夹地址 ${pageUrlList}`)
  // const hasName = pageList.every(n => {
  //   return n.replace
  // })
}