"use strict"

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
  console.info('seeding blogpost data');
  let seedData = [];

  for (let i = 0; i <= 10; i++) {
    seedData.push(generateBlogPostData());
  }

  return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
  return {
    title: faker.lorem.sentence(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    content: faker.lorem.text()
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('BlogPosts API resource', function() {
  before(function(){
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function(){
    return seedBlogPostData();
  });

  afterEach(function(){
    return tearDownDb();
  });

  after(function(){
    return closeServer();
  });

  describe('GET endpoint', function(){
    it('should return all existing posts', function(){
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res){
          res = _res;
          expect(res).to.have.status(200);
          expect(res.body).to.have.length.at.least(1);
          return BlogPost.count();
        })
        .then(function(count){
          expect(res.body).to.have.lengthOf(count);
        });
    });

    it('should return posts with right fields', function(){
      let resPost;
      return chai.request(app)
        .get('/posts')
        .then(function(res){
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.lengthOf.at.least(1);

          res.body.forEach(function(post){
            expect(post).to.be.a('object');
            expect(post).to.include.keys('title', 'author', 'content');
          });

          resPost = res.body[0];
          return BlogPost.findById(resPost.id);
        })
        .then(function(post){
          expect(resPost.id).to.equal(post.id);
          expect(resPost.title).to.equal(post.title);
          expect(resPost.content).to.equal(post.content);
          expect(resPost.author).to.contain(post.author.firstName);
          expect(resPost.author).to.contain(post.author.lastName);
        })
    });
  });

  describe('POST endpoint', function(){
    it('should add a new blogpost', function(){
      const newPost = generateBlogPostData();
      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res){
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys('title', 'author', 'content');
          expect(res.body.id).to.not.be.null;
          expect(res.body.title).to.equal(newPost.title);
          expect(res.body.content).to.equal(newPost.content);
          return BlogPost.findById(res.body.id)
        })
        .then(function(post){
          expect(post.title).to.equal(newPost.title);
          expect(post.author.firstName).to.equal(newPost.author.firstName);
          expect(post.author.lastName).to.equal(newPost.author.lastName);
          expect(post.content).to.equal(newPost.content);
        });
    });
  });

  describe('PUT endpoint', function(){
    it('should update fields you send over', function(){
      const updateData = {
        title: 'some short title',
        content: 'a lot of content...'
      }

      return BlogPost.findOne()
        .then(function(post){
          updateData.id = post.id

          return chai.request(app)
            .put(`/posts/${post.id}`)
            .send(updateData);
        })
        .then(function(res){
          expect(res).to.have.status(204)

          return BlogPost.findById(updateData.id);
        })
        .then(function(post){
          expect(post.title).to.equal(updateData.title);
          expect(post.content).to.equal(updateData.content);
        });
    });
  });

  describe('DELETE endpoint', function(){
    it('delete a post by id', function(){
      let post;

      return BlogPost.findOne()
        .then(function(_post){
          post = _post;
          return chai.request(app).delete(`/posts/${post.id}`)
        })
        .then(function(res){
          expect(res).to.have.status(204);
          return BlogPost.findById(post.id)
        })
        .then(function(_post){
          expect(_post).to.be.null;
        });
    });
  });

});