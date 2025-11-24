import com.du.dao.BlogMapper;
import com.du.pojo.Blog;
import com.du.utils.IdUtils;
import com.du.utils.MybatisUtils;
import org.apache.ibatis.session.SqlSession;

import java.util.*;

public class Test {
       @org.junit.Test
       public void test(){
            SqlSession sqlSession = MybatisUtils.getSqlSession();
            BlogMapper mapper = sqlSession.getMapper(BlogMapper.class);
            Blog blog = new Blog();
            blog.setId(IdUtils.getId());
               blog.setTitle("Mybatis如此简单");
               blog.setAuthor("狂神说");
               blog.setCreateTime(new Date());
               blog.setViews(9999);

           int flag =  mapper.addBlog(blog);
            System.out.println(flag);
//           sqlSession.commit();
            sqlSession.close();
        }
        @org.junit.Test
        public void testIf(){
            SqlSession sqlSession = MybatisUtils.getSqlSession();
            BlogMapper mapper = sqlSession.getMapper(BlogMapper.class);
            Map map = new HashMap();
            map.put("title","如何学习SQL");
//            map.put("author","张三");
            List<Blog> blogs = mapper.queryBlogIF(map);
            for (Blog blog : blogs) {
                System.out.println(blog);
            }
            sqlSession.close();
        }
        @org.junit.Test
        public void testChoose(){
            SqlSession sqlSession = MybatisUtils.getSqlSession();
            BlogMapper mapper = sqlSession.getMapper(BlogMapper.class);
            Map map = new HashMap();
            map.put("title","如何学习SQL");
//            map.put("views",9999);
            List<Blog> blogs = mapper.queryBlogChoose(map);
            for (Blog blog : blogs) {
                System.out.println(blog);
            }
            sqlSession.close();
        }

        @org.junit.Test
        public void TestQueryBlogForeach(){
            SqlSession sqlSession = MybatisUtils.getSqlSession();
            BlogMapper mapper = sqlSession.getMapper(BlogMapper.class);
            Map map = new HashMap();
            List<Integer> ids = new ArrayList<Integer>();
            ids.add(1);
//            ids.add(2);
//            ids.add(3);
            map.put("ids",ids);
            List<Blog> blogs = mapper.queryBlogForeach(map);
            for (Blog blog : blogs) {
                System.out.println(blog);
            }
            sqlSession.close();
        }


}





