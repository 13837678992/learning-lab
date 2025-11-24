package com.du.lambda;

public class TestLambda1 {
    class Lambda1 implements ILove {
        @Override
        public void love() {
            System.out.println("i love you1");
        }
    }

    public static void main(String[] args) {
        Lambda1 Lambda1 = (new TestLambda1()).new Lambda1();
        Lambda1.love();
        class Lambda2 implements ILove {
            @Override
            public void love() {
                System.out.println("i love you2");
            }
        }
        ILove lambda2 = new Lambda2();
        lambda2.love();
        ILove lambda3 =()->{
            System.out.println("i love you3");
        };
        lambda3.love();

    }
}

interface ILove {
    public void love();
}
class Lambda implements ILove {
    @Override
    public void love() {
        System.out.println("i love you");
    }
}