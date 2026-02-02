//JWT authentication middleware
//protects routes by verifying JWT tokens

const jwt = require('jsonwebtoken');

//middleware function
//runs before protected route handlers
//checks if user has valid jwt token

const authMiddleware = (req,res,next) => {
    try{
        // step 1: Get token from request header
        //Header format: "Authorization: Bearer iuhfhuhowfowfowAEFE.."
        const authHeader = req.headers.authorization;

        //step 2: check if authorization header exists
        if(!authHeader){
            return res.status(401).json({error: 'No token provided'});

        }

        //step 3: Extract token(remove "bearer prefix")
        // "Bearer token123" -> "token123"

        const token = authHeader.split(' ')[1]; //split by space take second part

        if(!token){
            return res.status(401).json({error: 'Invalid token format'});
        }

        //Step 4: verify token with JWT_SECRECT
        //if tokens is valid, jwt.verify returns the decoded payload
        //if tokens is invalid/expired, it throws an error(caught by catch block)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //step 5: Attach user info to request object
        //now all route handlers can access req.user
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        };

        //Step 6: continue to next middleware/route handler
        next();

    } catch(error){
        //Token verification failed(invalid signature, expired, etc)
        console.error('Auth middleware error: ',error.message);

        if(error.name === 'TokenExpiredError'){
            return res.status(401).json({error: 'Token expire, please login'});

        }
        return res.status(401).json({error: 'Invalid token'});
    }
};

//Export 
//Usage: router.get('/protected', authMiddleware, controller)
module.exports = authMiddleware;

