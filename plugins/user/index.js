const knex = appRequire('init/knex').knex;
const crypto = require('crypto');
const account = appRequire('plugins/account/index');

const checkPasswordLimit = {
    number: 5,
    time: 30 * 1000,
};
const checkPasswordFail = {};

//判断用户是否存在
const checkExist = async (obj) => {
    const user = await knex('user').select().where(obj);
    if (user.length === 0) {
        return;
    } else {
        return Promise.reject();
    }
};

const md5 = function (text) {
    return crypto.createHash('md5').update(text).digest('hex');
};

//创建md5 密码
const createPassword = function (password, username) {
    return md5(password + username);
};

//添加用户
const addUser = async (options) => {
    try {
        const insert = {};
        if (options.username) {
            await checkExist({username: options.username});
            Object.assign(insert, {username: options.username});
        }
        if (options.email) {
            await checkExist({email: options.email});
            Object.assign(insert, {email: options.email});
        }
        if (options.telegram) {
            await checkExist({telegram: options.telegram});
            Object.assign(insert, {telegram: options.telegram});
        }
        Object.assign(insert, {
            type: options.type,
            createTime: Date.now()
        });
        if (options.username && options.password) {
            Object.assign(insert, {
                password: createPassword(options.password, options.username)
            });
        }
        return knex('user').insert(insert);
    } catch (err) {
        console.log(err);
        return Promise.reject(err);
    }
};

//验证密码
const checkPassword = async (username, password) => {
    try {
        const user = await knex('user').select(['id', 'type', 'username', 'password']).where({
            username,
        });
        if (user.length === 0) {
            return Promise.reject('user not exists');
        }
        for (const cpf in checkPasswordFail) {
            if (Date.now() - checkPasswordFail[cpf].time >= checkPasswordLimit.time) {
                delete checkPasswordFail[cpf];
            }
        }
        ;
        if (checkPasswordFail[username] &&
            checkPasswordFail[username].number > checkPasswordLimit.number &&
            Date.now() - checkPasswordFail[username].time < checkPasswordLimit.time
        ) {
            return Promise.reject('password retry out of limit');
        }
        if (createPassword(password, username) === user[0].password) {
            await knex('user').update({
                lastLogin: Date.now(),
            }).where({
                username,
            });
            return user[0];
        } else {
            if (!checkPasswordFail[username] || Date.now() - checkPasswordFail[username].time >= checkPasswordLimit.time) {
                checkPasswordFail[username] = {number: 1, time: Date.now()};
            } else if (checkPasswordFail[username].number <= checkPasswordLimit.number) {
                checkPasswordFail[username].number += 1;
                checkPasswordFail[username].time = Date.now();
            }
            return Promise.reject('invalid password');
        }
    } catch (err) {
        return Promise.reject(err);
    }
};

//验证密码
const androidCheckPassword = async (username, password) => {
    try {
        const user = await knex('user').select(['id', 'type', 'username', 'password','point']).where({
            username,
        });
        if (user.length === 0) {
            //如果用户不存在就注册用户
            try {
                const insert = {};
                Object.assign(insert, {
                    username: username,
                    email: username,
                    telegram: '',
                    type: 'normal',
                    createTime: Date.now(),
                    password: createPassword(password, username),
                });
                const userId = await knex('user').insert(insert).insertId;
                if (userId>1) {
                    // let port = 50000;
                    console.log(`userId=[${ userId}]`);
                    await knex('webguiSetting').select().where({
                        key: 'account',
                    })
                        .then(success => JSON.parse(success[0].value))
                        .then(success => {
                            const newUserAccount = success.accountForNewUser;
                            if (!success.accountForNewUser.isEnable) {
                                return;
                            }
                            const getNewPort = () => {
                                return knex('webguiSetting').select().where({
                                    key: 'account',
                                }).then(success => {
                                    if (!success.length) {
                                        return Promise.reject('settings not found');
                                    }
                                    success[0].value = JSON.parse(success[0].value);
                                    return success[0].value.port;
                                }).then(port => {
                                    if (port.random) {
                                        const getRandomPort = () => Math.floor(Math.random() * (port.end - port.start + 1) + port.start);
                                        let retry = 0;
                                        let myPort = getRandomPort();
                                        const checkIfPortExists = port => {
                                            let myPort = port;
                                            return knex('account_plugin').select()
                                                .where({port}).then(success => {
                                                    if (success.length && retry <= 30) {
                                                        retry++;
                                                        myPort = getRandomPort();
                                                        return checkIfPortExists(myPort);
                                                    } else if (success.length && retry > 30) {
                                                        return Promise.reject('Can not get a random port');
                                                    } else {
                                                        return myPort;
                                                    }
                                                });
                                        };
                                        return checkIfPortExists(myPort);
                                    } else {
                                        return knex('account_plugin').select()
                                            .whereBetween('port', [port.start, port.end])
                                            .orderBy('port', 'DESC').limit(1).then(success => {
                                                if (success.length) {
                                                    return success[0].port + 1;
                                                }
                                                return port.start;
                                            });
                                    }
                                });
                            };
                            getNewPort().then(port => {
                               account.addAccount(newUserAccount.type || 5, {
                                    user: userId,
                                    port,
                                    password: Math.random().toString().substr(2, 10),
                                    time: Date.now(),
                                    limit: newUserAccount.limit || 8,
                                    flow: (newUserAccount.flow ? newUserAccount.flow : 350) * 1000000,
                                    autoRemove: 1,
                                })

                            });

                        });
                    const user = await knex('user').select(['id', 'type', 'username', 'password','point']).where({
                        username,
                    });
                    return user[0];
                } else {
                    return Promise.reject('user not exists');
                }
            } catch (err) {
                console.log(err);
                return Promise.reject(err);
            }
        }
        for (const cpf in checkPasswordFail) {
            if (Date.now() - checkPasswordFail[cpf].time >= checkPasswordLimit.time) {
                delete checkPasswordFail[cpf];
            }
        }
        ;
        if (checkPasswordFail[username] &&
            checkPasswordFail[username].number > checkPasswordLimit.number &&
            Date.now() - checkPasswordFail[username].time < checkPasswordLimit.time
        ) {
            return Promise.reject('password retry out of limit');
        }
        //更新登陆时间
        if (createPassword(password, username) === user[0].password) {
            await knex('user').update({
                lastLogin: Date.now(),
            }).where({
                username,
            });
            return user[0];
        } else {
            if (!checkPasswordFail[username] || Date.now() - checkPasswordFail[username].time >= checkPasswordLimit.time) {
                checkPasswordFail[username] = {number: 1, time: Date.now()};
            } else if (checkPasswordFail[username].number <= checkPasswordLimit.number) {
                checkPasswordFail[username].number += 1;
                checkPasswordFail[username].time = Date.now();
            }
            return Promise.reject('invalid password');
        }
    } catch (err) {
        return Promise.reject(err);
    }
};

//修改用户信息
const editUser = async (userInfo, edit) => {
    try {
        const username = (await knex('user').select().where(userInfo))[0].username;
        if (!username) {
            throw new Error('user not found');
        }
        if (edit.password) {
            edit.password = createPassword(edit.password, username);
        }
        const user = await knex('user').update(edit).where(userInfo);
        return;
    } catch (err) {
        return Promise.reject(err);
    }
};

//获取用户列表
const getUsers = async () => {
    const users = await knex('user').select().where({
        type: 'normal',
    });
    return users;
};

//获取最近注册的用户
const getRecentSignUpUsers = async (number) => {
    const users = await knex('user').select().where({
        type: 'normal',
    }).orderBy('createTime', 'desc').limit(number);
    return users;
};

//获取最近登录的用户
const getRecentLoginUsers = async (number) => {
    const users = await knex('user').select().where({
        type: 'normal',
    }).orderBy('lastLogin', 'desc').limit(number);
    return users;
};

//获取一个用户信息
const getOneUser = async (id) => {
    const user = await knex('user').select().where({
        type: 'normal',
        id,
    });
    if (!user.length) {
        return Promise.reject('User not found');
    }
    return user[0];
};

//分页获取用户信息
const getUserAndPaging = async (opt = {}) => {

    const search = opt.search || '';
    const filter = opt.filter || 'all';
    const sort = opt.sort || 'id_asc';
    const page = opt.page || 1;
    const pageSize = opt.pageSize || 20;

    let count = knex('user').select().where({type: 'normal'});
    // let users = knex('user').select().where({ type: 'normal' });

    let users = knex('user').select([
        'user.id as id',
        'user.username as username',
        'user.email as email',
        'user.telegram as telegram',
        'user.password as password',
        'user.type as type',
        'user.createTime as createTime',
        'user.lastLogin as lastLogin',
        'user.resetPasswordId as resetPasswordId',
        'user.resetPasswordTime as resetPasswordTime',
        'account_plugin.port as port',
    ]).leftJoin('account_plugin', 'user.id', 'account_plugin.userId')
        .where({'user.type': 'normal'}).groupBy('user.id');

    if (search) {
        count = count.where('username', 'like', `%${ search }%`);
        users = users.where('username', 'like', `%${ search }%`);
    }

    count = await count.count('id as count').then(success => success[0].count);
    users = await users.orderBy(sort.split('_')[0], sort.split('_')[1]).limit(pageSize).offset((page - 1) * pageSize);
    const maxPage = Math.ceil(count / pageSize);
    return {
        total: count,
        page,
        maxPage,
        pageSize,
        users,
    };
};

//删除用户
const deleteUser = async userId => {
    if (!userId) {
        return Promise.reject('invalid userId');
    }
    const existAccount = await knex('account_plugin').select().where({
        userId,
    });
    if (existAccount.length) {
        return Promise.reject('delete user fail');
    }
    const deleteCount = await knex('user').delete().where({
        id: userId,
    });
    if (deleteCount >= 1) {
        return;
    } else {
        return Promise.reject('delete user fail');
    }
};

//修改密码
const changePassword = async (userId, oldPassword, newPassword) => {
    const userInfo = await knex('user').where({
        id: userId,
    }).then(user => {
        if (!user.length) {
            return Promise.reject('user not found');
        }
        return user[0];
    });
    await checkPassword(userInfo.username, oldPassword);
    await editUser({
        id: userId,
    }, {
        password: newPassword,
    });
};

exports.add = addUser;
exports.edit = editUser;
exports.checkPassword = checkPassword;
exports.androidCheckPassword = androidCheckPassword;
exports.get = getUsers;
exports.getRecentSignUp = getRecentSignUpUsers;
exports.getRecentLogin = getRecentLoginUsers;
exports.getOne = getOneUser;
exports.getUserAndPaging = getUserAndPaging;
exports.delete = deleteUser;
exports.changePassword = changePassword;