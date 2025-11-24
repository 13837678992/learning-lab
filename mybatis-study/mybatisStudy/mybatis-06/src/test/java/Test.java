import com.du.dao.StudentMapper;
import com.du.dao.TeacherMapper;
import com.du.pojo.Student;
import com.du.pojo.Teacher;
import com.du.utils.MybatisUtils;
import org.apache.ibatis.session.SqlSession;

import java.util.List;

public class Test {
    @org.junit.Test
    public void TestTeacher() {
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        TeacherMapper teacherMapper = sqlSession.getMapper(TeacherMapper.class);
        List<Teacher> teacher = teacherMapper.getTeacher();
        for (Teacher teacher1 : teacher) {
            System.out.println(teacher1);
        }
        sqlSession.close();

    }



}





