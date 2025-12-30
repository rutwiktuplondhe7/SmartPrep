import React, { useState } from 'react';
import { LuEye, LuEyeOff } from "react-icons/lu";


const Input = ({ value, onChange, label, placeholder, type }) => {
    
    const [showPassword, setShowPassword] = useState(false);
    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    };

    return (
        <div>
            <label className="text-[13px] text-slate-800">
                {label}
            </label>
            <div className='input-box'>
                <input
                    type={type === "password" ? (showPassword ? "text" : "password") : type}
                    placeholder={placeholder}
                    className='w-full bg-transparent outline-none'
                    value={value}
                    onChange={(e) => { onChange(e) }}
                /> 
                {
    type === "password" &&
        (
            showPassword ? (
                <span
                    className='text-primary cursor-pointer'
                    style={{ fontSize: '22px' }}
                    onClick={toggleShowPassword}
                >
                    <LuEye />
                </span>
            ) : (
                <span
                    className='text-slate-400 cursor-pointer'
                    style={{ fontSize: '22px' }}
                    onClick={toggleShowPassword}
                >
                    <LuEyeOff />
                </span>
            )
        )
}

                
            </div>
        </div>
    );
}

export default Input;
