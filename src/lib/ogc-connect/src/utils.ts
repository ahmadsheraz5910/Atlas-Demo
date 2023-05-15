
export function removeUndefinedsFromObject<T>(A:T){
    type NonNullableMyObj = {
      [K in keyof T]: NonNullable<T[K]>;
    };
      
    const has = Object.values(A as object).some((value) => value !== undefined && value !== null)
    return  has ? A as {
      [K in keyof T]: NonNullable<T[K]>;
    }: undefined
    
}

const a:{sss:undefined|{a:"s"}, b:undefined| string} = {
  sss:{a:"s"},
  b:undefined
}
const x = removeUndefinedsFromObject(a)
if (x){
  
}
