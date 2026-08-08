import { createContext } from "react";

export const AppContext =createContext()


const AppContextProvider =(props)=>{

    const currency = '₹'

    const calculateAge = (dob)=>{
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();

        const monthDiff = today.getMonth() - birthDate.getMonth();
        if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())){
            age--;
        }

        return age;
    }
    
    const value ={calculateAge,currency}

    return <AppContext.Provider value={value}>
        {props.children}
    </AppContext.Provider>
}

export default AppContextProvider;