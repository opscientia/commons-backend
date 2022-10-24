const authCheck = (req, res, next) => {
    if(!req.user){
        res.redirect('/auth/login');
    } else {
        next();
    }
};

const onProfilePage = (req, res) => {
    // should render a user profile page on frontend
    res.send('you are logged in, this is your profile - ' + req.user.name);
};

module.exports = {
    authCheck,
    onProfilePage
};