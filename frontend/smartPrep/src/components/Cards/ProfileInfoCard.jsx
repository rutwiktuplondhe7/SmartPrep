import React, { useContext } from 'react'
import { UserContext } from '../../context/userContext'
import { useNavigate } from 'react-router-dom'
import DEFAULT_PROFILE_IMG from '../../assets/default-profile.png'

const ProfileInfoCard = () => {
  const { user, clearUser } = useContext(UserContext)
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.clear()
    clearUser()
    navigate('/')
  }

  const profileImg = user?.profileImageUrl ? user.profileImageUrl : DEFAULT_PROFILE_IMG

  return (
    user && (
      <div className="flex items-center">
        <img
          src={profileImg}
          alt="User-Profile-Image"
          className="w-14 h-14 bg-gray-300 rounded-full mr-3 object-cover"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_PROFILE_IMG
          }}
        />

        <div>
          <div className="text-[15px] text-black font-bold leading-3">
            {user?.name || ""}
        </div>

         
          <button
            className="text-rose-600 text-sm font-semibold cursor-pointer hover:underline"
            onClick={handleLogout}
          >
            Logout
          </button>
          
        </div>
      </div>
    )
  )
}

export default ProfileInfoCard
