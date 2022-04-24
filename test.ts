import {compileAndRun} from './parser'

//一个函数的声明，这个函数很简单，只打印"Hello World!"
const stream = `function sayHello(){
    println("Hello World!");
}
sayHello();
`


// 运行示例
compileAndRun(stream)