class Person:
    def __call__(self,name):
        print("__call__" + "hello " + name)
    def hello(self,name):
        print("hello" + name)

person = Person()
person("zhangSan")
person.hello("liSi")
