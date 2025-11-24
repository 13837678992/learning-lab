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
        Teacher teacher = teacherMapper.getTeacher(101);
        System.out.println(teacher);
        sqlSession.close();

    }
    @org.junit.Test
    public void TestStudent() {
        SqlSession sqlSession = MybatisUtils.getSqlSession();
        StudentMapper studentMapper = sqlSession.getMapper(StudentMapper.class);
        List<Student> student = studentMapper.getStudent(1);
        for (int i = 0; i < student.size(); i++) {
            System.out.println(student.get(i));
        }
        sqlSession.close();

    }


}





