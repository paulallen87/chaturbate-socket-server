'use strict';

const {expect} = require('chai');
const ChaturbateSocketServer = require('../index');

describe('ChaturbateSocketServer', () => {
  it('should be exported', () => {
    expect(ChaturbateSocketServer).to.not.equal(undefined);
  });
});
