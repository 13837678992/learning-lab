package com.du;

import io.minio.*;
import io.minio.errors.*;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

public class TestMinio {
    public static void main(String[] args) {
        String endpoint = "http://100.71.149.5:9000";
        String accessKey = "minioadmin";
        String secretKey = "minioadmin";
        String bucketName = "video";

        MinioClient minioClient = MinioClient.builder().endpoint(endpoint).credentials(accessKey, secretKey).build();
        try {
            boolean bucketExists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!bucketExists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
            String policy = """
                        {
                          "Statement" : [ {
                            "Action" : "s3:GetObject",
                            "Effect" : "Allow",
                            "Principal" : "*",
                            "Resource" : "arn:aws:s3:::%s/*"
                          } ],
                          "Version" : "2012-10-17"
                        }
                        """.formatted(bucketName);
            minioClient.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
            minioClient.uploadObject(UploadObjectArgs.builder().filename("C:\\Users\\16782\\Downloads\\IMG_0428.DNG").bucket(bucketName).object("IMG_0428.DNG").build());
        } catch (Exception e) {
            e.printStackTrace();
        }

    }
}