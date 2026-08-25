const eyeIcon = document.getElementById("eye")
const passwordEngine = document.getElementById("password")

eyeIcon.addEventListener("click",()=>{
    const Ispassword = passwordEngine.type === "password"
    passwordEngine = Ispassword ? "text" : "password"
    eyeIcon.classList.toggle("fa-eye-slash",Ispassword)
    
})