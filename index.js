const mysql = require('mysql')
const express = require('express')
const path = require('path')
const app = express()
const bodyParser = require('body-parser')
const uuid = require('uuid/v4')
const session = require('express-session')
const FileStore = require('session-file-store')(session)
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

// Set the default templating engine to ejs
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(__dirname + "/public"))
app.use(express.static('public'))
app.use(bodyParser.urlencoded({extended: true}));



// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
    { usernameField: 'username' },
    (username, password, done) => {
        console.log('Inside local strategy callback')

        var connection = mysql.createConnection(
            {
                host : 'localhost',
                user : 'root',
                password : '12345678',
                database : 'chat_app_db'
            }
        )
        var credentials = {
            username: username,
            password: password,
        }




        var check_query = 'select user_id, username from users where (username = ?) && (password= ?)'
        connection.query(check_query, [credentials.username, credentials.password], (err, results ) => {
            if(err) throw err
            connection.on('error', function() {})
            try {


                if(results) {
                    var user = {id :results[0].user_id, username: results[0].username }
                    return done(null, user)
                }
        }
        catch (err) {
                return done(null, false)
        }


    }
)}))

passport.serializeUser((user, done) => {
    console.log('Inside serializeUser callback. User id is save to the session file store here')
    done(null, user.id);
})

passport.deserializeUser((id, done) => {
    console.log('Inside deserializeUser callback')
    console.log(`The user id passport saved in the session file store is: ${id}`)

    var connection = mysql.createConnection(
        {
            host : 'localhost',
            user : 'root',
            password : '12345678',
            database : 'chat_app_db'
        }
    )




    var check_query = 'select user_id, username from users where (user_id = ? )'
    connection.query(check_query, [id], (err, results ) => {
        connection.on('error', function() {})
        try {


            if (results) {
                var user = {id: results[0].user_id, username: results[0].username}
                return done(null, user)
            }
        } catch {

            return done(null, false)
        }

    })

});



app.get('/', (req,res) => {
    res.render('index')
})
app.get('/create', (req,res) => {
    var connection = mysql.createConnection(
        {
            host : 'localhost',
            user : 'root',
            password : '12345678',
            database : 'chat_app_db'
        }
    )
    var occupied_usernames_query = 'select username from users;'
    connection.query(occupied_usernames_query, (error, results) => {
    try {
        if (error) throw error


        var occupied_usernames_and_emails_string_obj = JSON.stringify(results)
        res.render("create", {occupied_usernames_and_emails_string: occupied_usernames_and_emails_string_obj})
        connection.on('error', function() {})
        connection.end()
    }
    catch (error) {
        res.redirect('/')
    }
    })

    })


app.post('/create/create_user', (req, res) => {

    var connection = mysql.createConnection(
        {
            host : 'localhost',
            user : 'root',
            password : '12345678',
            database : 'chat_app_db'
        }
    )
    var new_user = {
        username: req.body.username,
        email:  req.body.email,
        password: req.body.password,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        sex: req.body.sex,
        dob: req.body.dob,
        contact_number: req.body.contact_number
    }
    var insert_query = 'insert into users set ?'
    try {
    connection.query(insert_query, new_user, function (err, results) {
            if(err) throw err
        res.redirect('/')
        connection.on('error', function() {})

    })}
    catch (err) {
        res.redirect('/create')
    }
    connection.end()
})

app.use(session({
    genid: (req) => {
        console.log('Inside session middleware genid function')
        console.log(`Request object sessionID from client: ${req.sessionID}`)
        return uuid() // use UUIDs for session IDs
    },
    store: new FileStore(),
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true
}))
app.use(passport.initialize());
app.use(passport.session());


app.get('/login', (req, res) => {
    res.render('login')
})
app.post('/login', (req, res, next) => {

    passport.authenticate('local', (err, user, info) => {
        console.log('Inside passport.authenticate() callback');
        console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
        console.log(`req.user: ${JSON.stringify(req.user)}`)
        req.login(user, (err) => {
            console.log('Inside req.login() callback')
            console.log(`req.session.passport: ${JSON.stringify(req.session.passport)}`)
            console.log(`req.user: ${JSON.stringify(req.user)}`)
            return res.redirect('/messages')
        })
    })(req, res, next);
     })

app.get('/messages', (req, res) => {

    if (req.isAuthenticated()) {
        //res.send('You are on messages' + req.session.passport.user)

        var connection = mysql.createConnection(
            {
                host: 'localhost',
                user: 'root',
                password: '12345678',
                database: 'chat_app_db'
            }
        )
        var logged_in_user = req.session.passport.user


        var contact_query = 'select concat(first_name, " ", last_name) as full_name, username from messages inner join users on (users.user_id = messages.sent_by ) or (users.user_id = messages.received_by) where ((sent_by = ?) or (received_by = ?)) && (users.user_id != ?) group by user_id  order by max(sent_at) desc ;'

        try {
        connection.query(contact_query, [logged_in_user, logged_in_user, logged_in_user], (err3, res3) => {
            if(err3) throw err3
            var contacts = res3

            var contacts = JSON.stringify(contacts)
            res.render('home', {contacts: contacts})
            connection.on('error', function() {})
            connection.end()

        })}
        catch(err3) {
            res.redirect('/')
        }

    } else {
        res.redirect('/')
    }

})

app.get('/messages/:username', (req, res) => {
    if(req.isAuthenticated()) {
        var connection = mysql.createConnection(
            {
                host: 'localhost',
                user: 'root',
                password: '12345678',
                database: 'chat_app_db'
            }
        )
        var logged_user = req.session.passport.user
        var connected_username = req.params.username
        find_id_query = 'select user_id from users where username = ?'
        connection.query(find_id_query, connected_username, (err2, res2) => {
            if(err2) throw err2
            try {
                var connected_user = res2[0].user_id

                var messages = 'select distinct content, if (sent_by = ?,true, false) as sent, sent_at from messages where ((sent_by = ?) && (received_by = ?)) or ((sent_by = ? ) && (received_by =?))  order by sent_at'
                connection.query(messages, [logged_user, connected_user, logged_user, logged_user, connected_user], (req3, res3) => {
                    var data = [res3, connected_user]

                    res.render('chat', {data: JSON.stringify(data)})
                    connection.on('error', function() {})
                    connection.end()
                })
            }
            catch (err2) {
                res.redirect('/messages')

            }
        })


    }

    else {
        res.redirect('/')
    }

})
app.post('/send', (req,res) => {
    if(req.isAuthenticated()) {
        var logged_user = req.session.passport.user
        var contact = req.body.user
        var message = req.body.message

        var connection = mysql.createConnection(
            {
                host: 'localhost',
                user: 'root',
                password: '12345678',
                database: 'chat_app_db'
            }
        )
        try {
        var send_query = 'insert into messages (sent_by, received_by, content) values (?,?,?)'
            console.log(contact)
        connection.query(send_query, [logged_user, contact, message], (err2, res2) => {
        if(err2) throw err2
        var find_username_query = 'select username from users where user_id = ?'
        connection.query(find_username_query, contact, (err3, res3) => {
            if(err3) throw err3
            var connected_username = res3[0].username
            res.redirect('/messages/'+connected_username)
            connection.on('error', function() {})
            connection.end()
        })
        })
        }
        catch(e) {
            res.redirect('/messages')

        }
    }
    else {
        res.redirect('/')
    }
})

app.post('/profile', (req,res) => {
    if(req.isAuthenticated()) {

        var connection = mysql.createConnection(
            {
                host: 'localhost',
                user: 'root',
                password: '12345678',
                database: 'chat_app_db'
            }
        )
        try {
            var profile_query = 'select username, email, concat(first_name, " ", last_name) as full_name, sex, dob from users where user_id = ?'
            connection.query(profile_query, req.body.user, (err2, res2) => {
                if (err2) throw err2
                var profile_data = res2[0]
                res.render('profile', {profile_data: profile_data})
                connection.on('error', function() {})
                connection.end()
            })
        }
        catch(err2) {
            res.redirect('/messages')
        }

    }

    else {
        res.redirect('/')
    }
})

app.listen(8006,() => {
    console.log('App listening to 8006')
})