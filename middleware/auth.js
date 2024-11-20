import jwt from 'jsonwebtoken';
import { Response } from '../utils/response.js';
import { message as msg} from '../utils/message.js';
import User from '../models/userModel.js';

export const isAuthenticated = async (req, res, next) => {
    try {
        // Parsing cookies
        const { token } = req.cookies;
        console.log(token);

        // Check token
        if(!token) {
            return Response(res, 401, false, msg.unAuthorizedMessage);
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user from token
        const user = await User.findById(decoded.id);

        // Check user
        if(!user) {
            return Response(res, 401, false, msg.unAuthorizedMessage);
        }

        req.user = user;
        next();
        
    } catch (error) {
        Response(res, 500, false, error.message);
    }
}